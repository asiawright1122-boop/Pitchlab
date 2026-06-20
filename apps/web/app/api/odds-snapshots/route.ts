import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const league = searchParams.get("league");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  try {
    const rows = await prisma.oddsSnapshot.findMany({
      take: limit,
      orderBy: { takenAt: "desc" },
      include: {
        fixture: { select: { league: true, home: true, away: true, kickoffUtc: true } },
      },
      where: league
        ? { fixture: { league } }
        : undefined,
    });

    const avgClv =
      rows.length > 0
        ? rows.reduce((s, r) => s + (r.clv ?? 0), 0) / rows.filter((r) => r.clv != null).length
        : null;

    return NextResponse.json({
      n: rows.length,
      avg_clv: avgClv != null && !Number.isNaN(avgClv) ? Math.round(avgClv * 10000) / 10000 : null,
      snapshots: rows.map((r) => ({
        fixture_id: r.fixtureId,
        league: r.fixture.league,
        home: r.fixture.home,
        away: r.fixture.away,
        kickoff_utc: r.fixture.kickoffUtc.toISOString(),
        book: r.book,
        market: r.market,
        selection: r.selection,
        price: r.price,
        close_fair_prob: r.closeFairProb,
        clv: r.clv,
        won: r.won,
        taken_at: r.takenAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[api/odds-snapshots]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
