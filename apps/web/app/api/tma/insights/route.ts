import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // 1. Auth
    const initData = request.headers.get("x-tma-init-data");
    let userId: string;

    if (initData) {
      const payload = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN || "");
      if (!payload) {
        return NextResponse.json({ error: "Invalid auth" }, { status: 403 });
      }
      const dbUser = await getOrCreateTmaUser(payload.user, payload.startParam);
      userId = dbUser.id;
    } else {
      const { getCurrentUser } = await import("@/lib/auth-server");
      const webUser = await getCurrentUser();
      if (!webUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = webUser.id;
    }

    // 2. Parse body
    const { fixtureId } = await request.json();
    if (!fixtureId) {
      return NextResponse.json({ error: "Missing fixtureId" }, { status: 400 });
    }

    // 3. Check unlock
    const unlock = await prisma.matchUnlock.findUnique({
      where: { userId_fixtureId: { userId, fixtureId } },
    });
    if (!unlock) {
      return NextResponse.json({ error: "Match not unlocked" }, { status: 403 });
    }

    // 4. Fetch fixture + predictions + odds
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        predictions: true,
        oddsSnapshots: {
          orderBy: { takenAt: "desc" },
          take: 15, // latest 3 selections × 5 snapshots
        },
      },
    });

    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    // 5. Fetch feedback metrics and Elo ratings from PublishedArtifact
    const [feedbackArtifact, eloArtifact, activeModelRow] = await Promise.all([
      prisma.publishedArtifact.findUnique({ where: { key: "feedback_snapshot" } }),
      prisma.publishedArtifact.findUnique({ where: { key: "league_elo" } }),
      prisma.systemSetting.findUnique({ where: { key: "active_model_version" } }),
    ]);

    const feedback = (feedbackArtifact?.payload as any) || null;
    const eloPayload = (eloArtifact?.payload as any) || null;

    let leagueClv: number | null = null;
    let leagueBrier: number | null = null;
    let holdoutBrier: number | null = null;
    let holdoutEce: number | null = null;

    if (feedback) {
      const clvItem = feedback.leagues_clv?.find((l: any) => l.code === fixture.league);
      if (clvItem) {
        leagueClv = clvItem.avg_clv;
        leagueBrier = clvItem.brier;
      }
      const holdoutItem = feedback.leagues_holdout_brier?.find((l: any) => l.code === fixture.league);
      if (holdoutItem) {
        holdoutBrier = holdoutItem.brier;
        holdoutEce = holdoutItem.ece;
      }
    }

    let homeElo: number | null = null;
    let awayElo: number | null = null;
    if (eloPayload && Array.isArray(eloPayload.teams)) {
      const hTeam = eloPayload.teams.find(
        (t: any) => t.team?.toLowerCase() === fixture.home?.toLowerCase()
      );
      const aTeam = eloPayload.teams.find(
        (t: any) => t.team?.toLowerCase() === fixture.away?.toLowerCase()
      );
      if (hTeam) homeElo = hTeam.elo;
      if (aTeam) awayElo = aTeam.elo;
    }

    // 6. Build context and odds movement for AI
    const activeModelVersion = (activeModelRow?.value as string) || "gbm-elo-v0";
    const targetModel = fixture.league === "WC" || fixture.league === "1" ? "wc2026-v1" : activeModelVersion;
    const predsForFixture = fixture.predictions.filter((p) => p.modelVersion === targetModel);

    const homeProb = predsForFixture.find((p) => p.selection === "home")?.prob;
    const drawProb = predsForFixture.find((p) => p.selection === "draw")?.prob;
    const awayProb = predsForFixture.find((p) => p.selection === "away")?.prob;

    const latestOdds = fixture.oddsSnapshots.reduce(
      (acc, o) => {
        if (!acc[o.selection]) acc[o.selection] = o.price;
        return acc;
      },
      {} as Record<string, number>
    );

    // Extract odds history (oldest to newest)
    const homeOddsHistory = fixture.oddsSnapshots
      .filter((o) => o.selection === "home")
      .map((o) => o.price)
      .reverse();
    const drawOddsHistory = fixture.oddsSnapshots
      .filter((o) => o.selection === "draw")
      .map((o) => o.price)
      .reverse();
    const awayOddsHistory = fixture.oddsSnapshots
      .filter((o) => o.selection === "away")
      .map((o) => o.price)
      .reverse();

    const contextBlock = `
Match: ${fixture.home} vs ${fixture.away}
League ID: ${fixture.league}
Kickoff (UTC): ${fixture.kickoffUtc.toISOString()}
Status: ${fixture.status}

Team Ratings (Elo):
- ${fixture.home}: ${homeElo ? homeElo.toFixed(1) : "N/A"}
- ${fixture.away}: ${awayElo ? awayElo.toFixed(1) : "N/A"}

Model Predictions (1x2):
- Home Win: ${homeProb ? (homeProb * 100).toFixed(1) + "%" : "N/A"}
- Draw: ${drawProb ? (drawProb * 100).toFixed(1) + "%" : "N/A"}
- Away Win: ${awayProb ? (awayProb * 100).toFixed(1) + "%" : "N/A"}

League Historical Model Performance (vs Pinnacle Closing Lines):
- Out-of-sample CLV: ${leagueClv !== null ? (leagueClv * 100).toFixed(2) + "%" : "N/A"}
- Brier Score (Feedback): ${leagueBrier !== null ? leagueBrier.toFixed(4) : "N/A"}
- Hold-out Brier Score (Monitor): ${holdoutBrier !== null ? holdoutBrier.toFixed(4) : "N/A"}
- Hold-out ECE (Calibration): ${holdoutEce !== null ? holdoutEce.toFixed(4) : "N/A"}

Latest Market Odds:
- Home: ${latestOdds["home"] || "N/A"}
- Draw: ${latestOdds["draw"] || "N/A"}
- Away: ${latestOdds["away"] || "N/A"}

Odds Movement History (oldest to latest):
- Home: ${homeOddsHistory.length > 0 ? homeOddsHistory.join(" -> ") : "N/A"}
- Draw: ${drawOddsHistory.length > 0 ? drawOddsHistory.join(" -> ") : "N/A"}
- Away: ${awayOddsHistory.length > 0 ? awayOddsHistory.join(" -> ") : "N/A"}
`.trim();

    // 7. Load AI config — prefer NVIDIA NIM, then DB config, then env vars
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    let baseURL: string;
    let apiKey: string;
    let modelName: string;

    if (nvidiaKey) {
      // NVIDIA NIM (OpenAI-compatible, preferred)
      baseURL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
      apiKey = nvidiaKey;
      modelName = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
    } else {
      // Fallback: DB config → env vars
      const aiConfigSetting = await prisma.systemSetting.findUnique({
        where: { key: "AI_CONFIG" },
      });

      baseURL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
      apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
      modelName = process.env.AI_MODEL || "gpt-4o-mini";

      if (aiConfigSetting?.value) {
        const dbConfig = aiConfigSetting.value as any;
        if (dbConfig.baseURL) baseURL = dbConfig.baseURL;
        if (dbConfig.apiKey) apiKey = dbConfig.apiKey;
        if (dbConfig.modelName) modelName = dbConfig.modelName;
      }
    }

    const provider = createOpenAI({ baseURL, apiKey });

    // 8. Generate insights
    const { text } = await generateText({
      model: provider.chat(modelName),
      system: `You are Quant Edge AI, a professional quantitative sports analyst.
Provide a deep, data-driven match preview in Chinese (简体中文).
Your goal is to convince professional/enthusiastic users of the value of this quantitative tool.
Use clear, cold, objective reasoning. Never use sales-like hype or promise winnings.

Structure your response with these sections using markdown headers:
## 🎯 核心价值判定
(Based on EV, model edge, and historic CLV of the league, state the clear recommendation or value bet selection.)

## 📊 数据量化解读
(Analyze Elo ratings, Dixon-Coles model probability vs market implied odds. Highlight where the edge is.)

## 📉 赔率波动趋势
(Interpret the market odds movement trajectory. Compare the model's fair odds against current market drift.)

## ⚠️ 风险提示与回测参考
(Point out model limits, reference the league out-of-sample CLV/Brier metrics, and caution the user on variance.)

Keep the overall response within 350-450 words. Be specific, use exact numbers, and avoid vague summaries.`,
      prompt: contextBlock,
    });

    return NextResponse.json({
      success: true,
      insights: text,
      fixture: {
        home: fixture.home,
        away: fixture.away,
        league: fixture.league,
        kickoff: fixture.kickoffUtc,
      },
    });
  } catch (error: any) {
    console.error("[Insights] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate insights" },
      { status: 500 }
    );
  }
}
