import type { PrismaClient } from "@prisma/client";

type SettlementFile = {
  updates: Array<{
    id: string;
    league: string;
    home: string;
    away: string;
    kickoff_utc: string;
    status: string;
    home_goals: number;
    away_goals: number;
  }>;
};

export async function importSettlements(
  prisma: PrismaClient,
  payload: SettlementFile
): Promise<number> {
  // 1. Fetch all existing fixtures to cache in memory
  const existingFixtures = await prisma.fixture.findMany({
    select: {
      id: true,
      status: true,
      homeGoals: true,
      awayGoals: true,
    }
  });

  const existingMap = new Map<string, { status: string; homeGoals: number | null; awayGoals: number | null }>();
  for (const f of existingFixtures) {
    existingMap.set(f.id, f);
  }

  let n = 0;
  for (const u of payload.updates) {
    if (u.id == null || u.home_goals == null || u.away_goals == null) continue;

    // Check if we already have the exact same record
    const existing = existingMap.get(u.id);
    if (
      existing &&
      existing.status === "finished" &&
      existing.homeGoals === u.home_goals &&
      existing.awayGoals === u.away_goals
    ) {
      continue; // Skip trip to DB
    }

    const kickoff = new Date(u.kickoff_utc);
    if (Number.isNaN(kickoff.getTime())) continue;

    await prisma.fixture.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        league: u.league,
        home: u.home,
        away: u.away,
        kickoffUtc: kickoff,
        status: "finished",
        homeGoals: u.home_goals,
        awayGoals: u.away_goals,
      },
      update: {
        status: "finished",
        homeGoals: u.home_goals,
        awayGoals: u.away_goals,
      },
    });
    n += 1;
  }
  return n;
}
