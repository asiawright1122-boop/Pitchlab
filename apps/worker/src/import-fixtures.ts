import type { PrismaClient } from "@prisma/client";

type FixtureRow = {
  id: string;
  league: string;
  home: string;
  away: string;
  kickoff_utc?: string | null;
  status?: string;
  home_goals?: number | null;
  away_goals?: number | null;
};

export type FixturesFile = {
  fixtures: FixtureRow[];
};

export const FALLBACK_KICKOFF = new Date("2026-06-15T12:00:00.000Z");

export async function importFixturesToDb(
  prisma: PrismaClient,
  payload: FixturesFile
): Promise<number> {
  // 1. Fetch existing fixtures to cache in memory
  const existingFixtures = await prisma.fixture.findMany({
    select: {
      id: true,
      status: true,
      homeGoals: true,
      awayGoals: true,
      kickoffUtc: true,
    }
  });

  const existingMap = new Map<string, { status: string; homeGoals: number | null; awayGoals: number | null; kickoffUtc: Date }>();
  for (const f of existingFixtures) {
    existingMap.set(f.id, f);
  }

  let n = 0;
  for (const f of payload.fixtures) {
    if (!f.id || !f.home || !f.away) continue;
    const kickoff = f.kickoff_utc ? new Date(f.kickoff_utc) : FALLBACK_KICKOFF;
    if (Number.isNaN(kickoff.getTime())) continue;

    // Check if we already have the exact same record
    const existing = existingMap.get(f.id);
    if (
      existing &&
      existing.status === (f.status || "scheduled") &&
      existing.homeGoals === (f.home_goals ?? null) &&
      existing.awayGoals === (f.away_goals ?? null) &&
      existing.kickoffUtc.getTime() === kickoff.getTime()
    ) {
      continue;
    }

    await prisma.fixture.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        league: f.league || "WC",
        home: f.home,
        away: f.away,
        kickoffUtc: kickoff,
        status: f.status || "scheduled",
        homeGoals: f.home_goals ?? null,
        awayGoals: f.away_goals ?? null,
      },
      update: {
        league: f.league || "WC",
        home: f.home,
        away: f.away,
        kickoffUtc: kickoff,
        status: f.status || "scheduled",
        homeGoals: f.home_goals ?? null,
        awayGoals: f.away_goals ?? null,
      },
    });
    n += 1;
  }
  return n;
}
