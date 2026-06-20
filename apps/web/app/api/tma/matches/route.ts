import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Auth check
    const initData = request.headers.get("x-tma-init-data");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    let dbUser = null;
    let unlockedFixtureIds = new Set<string>();

    if (!initData) {
      if (process.env.NODE_ENV === "development") {
        const mockTmaUser = { id: 999999, first_name: "Dev", username: "devuser" };
        const user = await getOrCreateTmaUser(mockTmaUser);
        const unlocks = await prisma.matchUnlock.findMany({
          where: { userId: user.id },
          select: { fixtureId: true }
        });
        unlockedFixtureIds = new Set(unlocks.map(u => u.fixtureId));
      } else {
        return NextResponse.json({ success: false, error: "Missing auth" }, { status: 401 });
      }
    } else {
      const payload = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN || "");
      if (!payload) {
        return NextResponse.json({ success: false, error: "Invalid auth" }, { status: 401 });
      }

      const user = await getOrCreateTmaUser(payload.user, payload.startParam);
      
      // Fetch unlocks for this user
      const unlocks = await prisma.matchUnlock.findMany({
        where: { userId: user.id },
        select: { fixtureId: true }
      });
      
      unlockedFixtureIds = new Set(unlocks.map(u => u.fixtureId));
    }

    // 2. Fetch upcoming fixtures
    const upcomingFixtures = await prisma.fixture.findMany({
      where: {
        kickoffUtc: {
          gte: new Date(),
        },
      },
      include: {
        predictions: true,
        oddsSnapshots: true,
      },
      orderBy: {
        kickoffUtc: "asc",
      },
      take: 10,
    });

    const activeModelRow = await prisma.systemSetting.findUnique({
      where: { key: "active_model_version" }
    });
    const activeModelVersion = (activeModelRow?.value as string) || "gbm-elo-v0";

    // 3. Format & Apply Data Masking
    const formattedMatches = upcomingFixtures.map((fixture) => {
      const isUnlocked = unlockedFixtureIds.has(fixture.id);

      const targetModel = fixture.league === "WC" || fixture.league === "1" ? "wc2026-v1" : activeModelVersion;
      const predsForFixture = fixture.predictions.filter(p => p.modelVersion === targetModel);

      const homePred = predsForFixture.find(p => p.market === "1x2" && p.selection === "home")?.prob || 0;
      const drawPred = predsForFixture.find(p => p.market === "1x2" && p.selection === "draw")?.prob || 0;
      const awayPred = predsForFixture.find(p => p.market === "1x2" && p.selection === "away")?.prob || 0;

      // Ensure they sum to ~100%, and multiply by 100 for display
      const homeWin = Math.round(homePred * 100);
      const draw = Math.round(drawPred * 100);
      const awayWin = Math.round(awayPred * 100);

      // Date formatting
      const dateObj = new Date(fixture.kickoffUtc);
      const timeString = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC"
      });
      const dayString = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const displayHome = isUnlocked ? homeWin : 33;
      const displayDraw = isUnlocked ? draw : 33;
      const displayAway = isUnlocked ? awayWin : 34;

      const getLatestSelectionOdds = (selection: string) => {
        const sorted = fixture.oddsSnapshots
          .filter((o) => o.selection === selection)
          .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
        const pin = sorted.find((o) => o.book.toLowerCase() === "pinnacle");
        return pin || sorted[0];
      };

      const homeOdds = getLatestSelectionOdds("home");
      const drawOdds = getLatestSelectionOdds("draw");
      const awayOdds = getLatestSelectionOdds("away");

      return {
        id: fixture.id,
        league: fixture.league === 'WC' ? 'World Cup 2026' : fixture.league,
        time: `${dayString}, ${timeString} UTC`,
        homeTeam: fixture.home,
        awayTeam: fixture.away,
        isUnlockedDefault: isUnlocked,
        prediction: {
          // Anti-leakage: mask values if locked
          homeWin: displayHome, 
          draw: displayDraw,
          awayWin: displayAway,
          valueBet: undefined, 
        },
        odds: {
          home: homeOdds ? homeOdds.price.toFixed(2) : (100 / (displayHome || 33)).toFixed(2),
          draw: drawOdds ? drawOdds.price.toFixed(2) : (100 / (displayDraw || 33)).toFixed(2),
          away: awayOdds ? awayOdds.price.toFixed(2) : (100 / (displayAway || 34)).toFixed(2),
        }
      };
    });

    const data = formattedMatches;

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error fetching tma matches:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
