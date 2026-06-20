import type { PrismaClient } from "@prisma/client";

const MODEL_VERSION = "pitchlab-dc-v0.1";

type LeaguePredFile = {
  league: string;
  predictions: Array<{
    date: string;
    home: string;
    away: string;
    home_prob: number;
    draw_prob: number;
    away_prob: number;
    actual?: string | null;
  }>;
};

type WcPredRow = {
  group: string;
  matchday: number;
  home: string;
  away: string;
  home_prob: number;
  draw_prob: number;
  away_prob: number;
};

function slug(...parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function predId(fixtureId: string, market: string, selection: string, modelVersion: string = MODEL_VERSION): string {
  return `${fixtureId}-${market}-${selection}-${modelVersion}`;
}

async function ensureFixture(
  prisma: PrismaClient,
  row: {
    id: string;
    league: string;
    home: string;
    away: string;
    kickoffUtc: Date;
    homeGoals?: number | null;
    awayGoals?: number | null;
    status?: string;
  }
): Promise<string> {
  await prisma.fixture.upsert({
    where: { id: row.id },
    create: {
      id: row.id,
      league: row.league,
      home: row.home,
      away: row.away,
      kickoffUtc: row.kickoffUtc,
      status: row.status ?? "scheduled",
      homeGoals: row.homeGoals ?? null,
      awayGoals: row.awayGoals ?? null,
    },
    update: {
      status: row.status ?? "scheduled",
      homeGoals: row.homeGoals ?? null,
      awayGoals: row.awayGoals ?? null,
    },
  });
  return row.id;
}

async function write1x2(
  prisma: PrismaClient,
  fixtureId: string,
  probs: { H: number; D: number; A: number },
  modelVersion: string = MODEL_VERSION,
  existingMap?: Map<string, number>
): Promise<number> {
  let n = 0;
  for (const [sel, prob] of Object.entries(probs) as [string, number][]) {
    const pId = predId(fixtureId, "1X2", sel, modelVersion);
    
    if (existingMap) {
      const cachedProb = existingMap.get(pId);
      if (cachedProb !== undefined && Math.abs(cachedProb - prob) < 0.0001) {
        continue; // Skip redundant trip to database
      }
    }

    await prisma.prediction.upsert({
      where: { id: pId },
      create: {
        id: pId,
        fixtureId,
        modelVersion: modelVersion,
        market: "1X2",
        selection: sel,
        prob,
      },
      update: { prob, modelVersion: modelVersion },
    });
    n += 1;
  }
  return n;
}

export async function importLeaguePredictions(
  prisma: PrismaClient,
  payload: LeaguePredFile
): Promise<number> {
  let n = 0;
  const modelVersion = (payload as any).model_version ?? MODEL_VERSION;

  // Cache existing predictions
  const existingPreds = await prisma.prediction.findMany({
    where: { modelVersion: modelVersion }
  });
  const existingMap = new Map<string, number>();
  for (const pr of existingPreds) {
    existingMap.set(pr.id, pr.prob);
  }

  for (const p of payload.predictions) {
    const fid = slug(payload.league, p.date, p.home, p.away);
    const kickoff = new Date(`${p.date}T15:00:00.000Z`);
    let status = "scheduled";
    let hg: number | null = null;
    let ag: number | null = null;
    if (p.actual === "H") {
      status = "finished";
      hg = 1;
      ag = 0;
    } else if (p.actual === "A") {
      status = "finished";
      hg = 0;
      ag = 1;
    } else if (p.actual === "D") {
      status = "finished";
      hg = 0;
      ag = 0;
    }
    await ensureFixture(prisma, {
      id: fid,
      league: payload.league,
      home: p.home,
      away: p.away,
      kickoffUtc: kickoff,
      status,
      homeGoals: hg,
      awayGoals: ag,
    });
    n += await write1x2(prisma, fid, { H: p.home_prob, D: p.draw_prob, A: p.away_prob }, modelVersion, existingMap);
  }
  return n;
}

export async function importWorldcupPredictions(
  prisma: PrismaClient,
  rows: WcPredRow[]
): Promise<number> {
  let n = 0;
  
  // Cache existing predictions for wc2026-v1
  const existingPreds = await prisma.prediction.findMany({
    where: { modelVersion: "wc2026-v1" }
  });
  const existingMap = new Map<string, number>();
  for (const pr of existingPreds) {
    existingMap.set(pr.id, pr.prob);
  }

  for (const p of rows) {
    const fid = slug("wc", p.group, String(p.matchday), p.home, p.away);
    await ensureFixture(prisma, {
      id: fid,
      league: "WC",
      home: p.home,
      away: p.away,
      kickoffUtc: new Date("2026-06-15T12:00:00.000Z"),
      status: "scheduled",
    });
    n += await write1x2(prisma, fid, {
      H: p.home_prob,
      D: p.draw_prob,
      A: p.away_prob,
    }, "wc2026-v1", existingMap);
  }
  return n;
}
