import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { ARTIFACT_FILENAMES } from "@/lib/artifact-keys";
import { prisma } from "@/lib/prisma";
import type { FixtureRecord, FixturesData } from "@/lib/types";

export const dynamic = "force-dynamic";

function loadStaticFixtures(): FixturesData | null {
  const filePath = path.join(process.cwd(), "public/data", ARTIFACT_FILENAMES.fixtures);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as FixturesData;
}

function loadStaticOddsSnapshots(): any[] {
  const filePath = path.join(process.cwd(), "public/data", "odds_snapshots.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data.snapshots || [];
  } catch (err) {
    console.error("[api/fixtures] loadStaticOddsSnapshots error", err);
    return [];
  }
}

export async function GET() {
  if (process.env.DATABASE_URL) {
    try {
      const activeModelRow = await prisma.systemSetting.findUnique({
        where: { key: "active_model_version" }
      });
      const activeModelVersion = (activeModelRow?.value as string) || "gbm-elo-v0";

      const rows = await prisma.fixture.findMany({
        orderBy: [{ league: "asc" }, { kickoffUtc: "asc" }],
        include: {
          predictions: true,
          oddsSnapshots: {
            where: { book: "pinnacle", market: "1x2" },
            orderBy: { takenAt: "asc" }
          }
        },
      });
      if (rows.length > 0) {
        const fixtures: FixtureRecord[] = rows.map((r) => {
          const targetModel = r.league === "WC" || r.league === "1" ? "wc2026-v1" : activeModelVersion;
          const predsForFixture = r.predictions.filter(p => p.modelVersion === targetModel);

          const home_prob = predsForFixture.find(p => p.market === "1x2" && p.selection === "home")?.prob ?? null;
          const draw_prob = predsForFixture.find(p => p.market === "1x2" && p.selection === "draw")?.prob ?? null;
          const away_prob = predsForFixture.find(p => p.market === "1x2" && p.selection === "away")?.prob ?? null;
          const over25 = predsForFixture.find(p => p.market === "o/u" && p.selection === "over25")?.prob ?? null;

          let group: string | null = null;
          let matchday: number | null = null;
          let stage: string | null = null;

          if (r.id.startsWith("wc-")) {
            const parts = r.id.split("-");
            if (parts.length >= 3) {
              group = parts[1].toUpperCase();
              matchday = parseInt(parts[2], 10);
              stage = "GROUP_STAGE";
            }
          }

          const odds_snapshots = r.oddsSnapshots.map(o => ({
            id: o.id,
            fixtureId: o.fixtureId,
            book: o.book,
            market: o.market,
            selection: o.selection === "H" ? "home" : o.selection === "D" ? "draw" : o.selection === "A" ? "away" : o.selection,
            price: o.price,
            takenAt: o.takenAt.toISOString()
          }));

          return {
            id: r.id,
            league: r.league,
            home: r.home,
            away: r.away,
            kickoff_utc: r.kickoffUtc.toISOString(),
            status: r.status,
            home_goals: r.homeGoals,
            away_goals: r.awayGoals,
            home_prob,
            draw_prob,
            away_prob,
            over25,
            group,
            matchday,
            stage,
            odds_snapshots
          };
        });
        return NextResponse.json({
          source: "postgres",
          competition: "WC",
          illustrative: false,
          fixtures,
        });
      }
    } catch (err) {
      console.error("[api/fixtures]", err);
    }
  }

  const staticData = loadStaticFixtures();
  if (staticData) {
    const staticOdds = loadStaticOddsSnapshots();
    const oddsMap = new Map<string, any[]>();
    for (const snap of staticOdds) {
      if (snap.book === "pinnacle" && snap.market === "1x2") {
        const list = oddsMap.get(snap.fixture_id) || [];
        list.push({
          id: snap.id || `${snap.fixture_id}-${snap.taken_at}-${snap.selection}`,
          fixtureId: snap.fixture_id,
          book: snap.book,
          market: snap.market,
          selection: snap.selection === "H" ? "home" : snap.selection === "D" ? "draw" : snap.selection === "A" ? "away" : snap.selection,
          price: snap.price,
          takenAt: snap.taken_at
        });
        oddsMap.set(snap.fixture_id, list);
      }
    }
    for (const f of staticData.fixtures) {
      f.odds_snapshots = oddsMap.get(f.id) || [];
    }
    return NextResponse.json({ ...staticData, source: staticData.source || "static_json" });
  }

  return NextResponse.json({ error: "no fixtures" }, { status: 404 });
}
