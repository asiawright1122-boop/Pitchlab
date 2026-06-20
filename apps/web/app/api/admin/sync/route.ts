import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin";
import { ApiFootballProvider } from "@/lib/providers/api-football";
import { settleOpenPaperTrades } from "@/lib/paper";
import { notifySettledTrades } from "@/lib/settlement-notifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const dateArg = (body as any).date;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const dates: string[] = dateArg ? [dateArg] : [fmt(today), fmt(tomorrow)];

    const provider = new ApiFootballProvider();
    const results: any[] = [];

    for (const date of dates) {
      // Fetch fixtures
      const fixtures = await provider.fetchFixturesByDate(date);
      // Fetch odds (Pinnacle = 17)
      const odds = await provider.fetchOddsByDate(date, 17);

      const oddsMap = new Map<number, any>();
      for (const o of odds) oddsMap.set(o.fixture.id, o);

      let upsertedFixtures = 0;
      let insertedOdds = 0;

      for (const item of fixtures) {
        const fid = String(item.fixture.id);
        const kickoff = new Date(item.fixture.date);

        await prisma.fixture.upsert({
          where: { id: fid },
          update: {
            status: item.fixture.status.short,
            homeGoals: item.goals.home,
            awayGoals: item.goals.away,
          },
          create: {
            id: fid,
            league: String(item.league.id),
            home: item.teams.home.name,
            away: item.teams.away.name,
            kickoffUtc: kickoff,
            status: item.fixture.status.short,
            homeGoals: item.goals.home,
            awayGoals: item.goals.away,
          },
        });
        upsertedFixtures++;

        const oddsInfo = oddsMap.get(item.fixture.id);
        if (oddsInfo?.bookmakers?.[0]) {
          const bk = oddsInfo.bookmakers[0];
          const mw = bk.bets.find((b: any) => b.id === 1 || b.name === "Match Winner");
          if (mw?.values) {
            const takenAt = new Date();
            for (const v of mw.values) {
              let sel = "";
              if (v.value === "Home") sel = "home";
              else if (v.value === "Draw") sel = "draw";
              else if (v.value === "Away") sel = "away";
              if (!sel) continue;
              try {
                await prisma.oddsSnapshot.create({
                  data: {
                    fixtureId: fid,
                    book: bk.name,
                    market: "1x2",
                    selection: sel,
                    price: parseFloat(v.odd),
                    takenAt,
                  },
                });
                insertedOdds++;
              } catch {
                // duplicate
              }
            }
          }
        }
      }

      results.push({ date, fixtures: upsertedFixtures, odds: insertedOdds });
    }

    // Trigger automatic global settlement after syncing fixtures
    const { count: settledCount, settled } = await settleOpenPaperTrades(prisma);
    if (settled.length > 0) {
      await notifySettledTrades(settled);
    }
    console.log(`[Admin Sync] Automatically settled ${settledCount} trades.`);

    return NextResponse.json({ success: true, results, settledCount });
  } catch (error: any) {
    console.error("[Admin Sync] Error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
