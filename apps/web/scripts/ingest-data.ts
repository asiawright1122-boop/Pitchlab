/**
 * PitchLab Data Ingestion Script
 * 
 * Pulls fixtures + odds from API-Football for today and tomorrow,
 * then upserts them into the local database.
 * 
 * Usage:
 *   npm run ingest            # sync today + tomorrow
 *   npm run ingest 2026-06-15 # sync a specific date
 */

import { PrismaClient } from "@prisma/client";

// We can't use @/ path aliases in standalone tsx scripts,
// so we inline the provider and sync logic here.

const prisma = new PrismaClient();

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    throw new Error("API_FOOTBALL_KEY is missing in .env");
  }
  return key;
}

async function fetchFixtures(date: string, apiKey: string) {
  const url = `${API_FOOTBALL_BASE}/fixtures?date=${date}`;
  console.log(`[Ingest] Fetching fixtures for ${date}...`);
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) throw new Error(`Fixtures fetch failed: ${res.statusText}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.error("[Ingest] API errors:", json.errors);
    throw new Error("API-Football returned errors for fixtures.");
  }
  return json.response as any[];
}

async function fetchOdds(date: string, apiKey: string, bookmaker = 17) {
  const url = `${API_FOOTBALL_BASE}/odds?date=${date}&bookmaker=${bookmaker}`;
  console.log(`[Ingest] Fetching odds for ${date} (bookmaker ${bookmaker})...`);
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) throw new Error(`Odds fetch failed: ${res.statusText}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.error("[Ingest] API errors:", json.errors);
    throw new Error("API-Football returned errors for odds.");
  }
  return json.response as any[];
}

async function syncDate(date: string) {
  const apiKey = getApiKey();

  const fixtures = await fetchFixtures(date, apiKey);
  console.log(`[Ingest] Got ${fixtures.length} fixtures`);

  const odds = await fetchOdds(date, apiKey);
  console.log(`[Ingest] Got ${odds.length} odds records`);

  // Build odds lookup
  const oddsMap = new Map<number, any>();
  for (const o of odds) {
    oddsMap.set(o.fixture.id, o);
  }

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

    // Attach odds snapshot if available
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
            // duplicate — ignore
          }
        }
      }
    }
  }

  return { date, upsertedFixtures, insertedOdds };
}

// ── main ──────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2]; // optional YYYY-MM-DD

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const dates = arg ? [arg] : [fmt(today), fmt(tomorrow)];

  console.log("═══════════════════════════════════════════");
  console.log("  PitchLab Data Ingest");
  console.log(`  Dates: ${dates.join(", ")}`);
  console.log("═══════════════════════════════════════════\n");

  for (const date of dates) {
    try {
      const result = await syncDate(date);
      console.log(`\n✅ ${date}: ${result.upsertedFixtures} fixtures, ${result.insertedOdds} odds\n`);
    } catch (err) {
      console.error(`\n❌ ${date}: ${err}\n`);
    }
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main();
