import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Recent prediction snapshots stored in Postgres (Phase 3). */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ source: "static", count: 0, predictions: [] });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "40", 10), 200);
  const league = searchParams.get("league");

  try {
    const where = league
      ? { fixture: { league } }
      : undefined;

    const [count, rows] = await Promise.all([
      prisma.prediction.count({ where }),
      prisma.prediction.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          fixture: {
            select: { league: true, home: true, away: true, kickoffUtc: true, status: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      source: "postgres",
      count,
      predictions: rows.map((r) => ({
        id: r.id,
        fixture_id: r.fixtureId,
        model_version: r.modelVersion,
        market: r.market,
        selection: r.selection,
        prob: r.prob,
        created_at: r.createdAt.toISOString(),
        fixture: r.fixture,
      })),
    });
  } catch (err) {
    console.error("[api/predictions]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
