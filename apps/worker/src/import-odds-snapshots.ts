import type { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

export type OddsSnapshotsFile = {
  snapshots: Array<{
    fixture_id: string;
    league: string;
    home: string;
    away: string;
    kickoff_utc: string;
    book?: string;
    market: string;
    selection: string;
    price: number;
    close_fair_prob?: number | null;
    clv?: number | null;
    won?: boolean | null;
    taken_at: string;
  }>;
};

export async function importOddsSnapshots(
  prisma: PrismaClient,
  payload: OddsSnapshotsFile
): Promise<number> {
  const snapshots = payload.snapshots ?? [];
  if (snapshots.length === 0) return 0;

  // 1. Fetch existing fixtures and snapshots to memory to avoid redundant queries
  const existingFixtures = await prisma.fixture.findMany({
    select: { id: true }
  });
  const fixtureIdSet = new Set(existingFixtures.map(f => f.id));

  const targetFixtureIds = Array.from(new Set(snapshots.map(s => s.fixture_id).filter(Boolean)));
  const existingSnapshots = await prisma.oddsSnapshot.findMany({
    where: {
      fixtureId: { in: targetFixtureIds }
    },
    select: {
      fixtureId: true,
      book: true,
      market: true,
      selection: true,
      takenAt: true,
      price: true,
      clv: true,
      won: true,
    }
  });

  const snapshotMap = new Map<string, { price: number; clv: number | null; won: boolean | null }>();
  for (const o of existingSnapshots) {
    const key = `${o.fixtureId}-${o.book}-${o.market}-${o.selection}-${o.takenAt.getTime()}`;
    snapshotMap.set(key, { price: o.price, clv: o.clv, won: o.won });
  }

  const toCreate: Array<any> = [];
  const toUpdate: Array<any> = [];

  for (const s of payload.snapshots ?? []) {
    if (!s.fixture_id || s.price == null) continue;
    const kickoff = new Date(s.kickoff_utc);
    const takenAt = new Date(s.taken_at);
    if (Number.isNaN(kickoff.getTime()) || Number.isNaN(takenAt.getTime())) continue;

    // Check if we need to upsert fixture
    if (!fixtureIdSet.has(s.fixture_id)) {
      await prisma.fixture.upsert({
        where: { id: s.fixture_id },
        create: {
          id: s.fixture_id,
          league: s.league,
          home: s.home,
          away: s.away,
          kickoffUtc: kickoff,
          status: "finished",
        },
        update: {},
      });
      fixtureIdSet.add(s.fixture_id);
    }

    const book = s.book ?? "pinnacle";
    const key = `${s.fixture_id}-${book}-${s.market}-${s.selection}-${takenAt.getTime()}`;
    const existing = snapshotMap.get(key);

    if (existing) {
      if (
        existing.price !== s.price ||
        existing.clv !== (s.clv ?? null) ||
        existing.won !== (s.won ?? null)
      ) {
        toUpdate.push({
          fixtureId: s.fixture_id,
          book,
          market: s.market,
          selection: s.selection,
          price: s.price,
          closeFairProb: s.close_fair_prob ?? null,
          clv: s.clv ?? null,
          won: s.won ?? null,
          takenAt,
        });
      }
    } else {
      toCreate.push({
        id: crypto.randomUUID(),
        fixtureId: s.fixture_id,
        book,
        market: s.market,
        selection: s.selection,
        price: s.price,
        closeFairProb: s.close_fair_prob ?? null,
        clv: s.clv ?? null,
        won: s.won ?? null,
        takenAt,
      });
    }
  }

  let totalProcessed = 0;

  if (toCreate.length > 0) {
    console.log(`[db:sync] Batch creating ${toCreate.length} new odds snapshots...`);
    const chunkSize = 5000;
    for (let i = 0; i < toCreate.length; i += chunkSize) {
      const chunk = toCreate.slice(i, i + chunkSize);
      const res = await prisma.oddsSnapshot.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      totalProcessed += res.count;
    }
    console.log(`[db:sync] Batch create finished. Created ${totalProcessed} records.`);
  }

  if (toUpdate.length > 0) {
    console.log(`[db:sync] Updating ${toUpdate.length} modified odds snapshots...`);
    const limit = 20;
    for (let i = 0; i < toUpdate.length; i += limit) {
      const chunk = toUpdate.slice(i, i + limit);
      await Promise.all(
        chunk.map(item =>
          prisma.oddsSnapshot.update({
            where: {
              fixtureId_book_market_selection_takenAt: {
                fixtureId: item.fixtureId,
                book: item.book,
                market: item.market,
                selection: item.selection,
                takenAt: item.takenAt,
              },
            },
            data: {
              price: item.price,
              closeFairProb: item.closeFairProb,
              clv: item.clv,
              won: item.won,
            },
          })
        )
      );
    }
    totalProcessed += toUpdate.length;
    console.log(`[db:sync] Update finished.`);
  }

  return totalProcessed;
}
