import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const LEAGUE_MAPPING: Record<string, string> = {
  "E0": "2324/E0.csv", // 英超 23/24 赛季
  "D1": "2324/D1.csv", // 德甲 23/24 赛季
  "SP1": "2324/SP1.csv", // 西甲 23/24 赛季
  "I1": "2324/I1.csv",  // 意甲 23/24 赛季
  "F1": "2324/F1.csv",  // 法甲 23/24 赛季
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function isTeamMatch(dbName: string, csvName: string): boolean {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cDb = clean(dbName);
  const cCsv = clean(csvName);

  const aliases: Record<string, string[]> = {
    "manchester city": ["man city", "mancity"],
    "manchester united": ["man united", "manutd", "man utd"],
    "tottenham": ["spurs", "tottenham hotspur"],
    "wolverhampton": ["wolves"],
    "nottingham forest": ["nott'm forest", "nottm forest"],
    "west ham": ["west ham united"],
    "newcastle": ["newcastle united"],
    "sheffield united": ["sheffield utd"],
    "luton": ["luton town"],
  };

  if (cDb === cCsv) return true;
  if (cDb.includes(cCsv) || cCsv.includes(cDb)) return true;

  const dbAliases = aliases[cDb] || [];
  for (const alias of dbAliases) {
    const cAlias = clean(alias);
    if (cAlias === cCsv || cCsv.includes(cAlias) || cAlias.includes(cCsv)) return true;
  }
  return false;
}

export async function syncCsvOdds(dataDir: string) {
  const prisma = new PrismaClient();
  const oddsPath = path.join(dataDir, "odds_snapshots.json");

  // 1. 读取原有的 odds_snapshots.json 缓存
  let existingPayload: { snapshots: any[] } = { snapshots: [] };
  if (fs.existsSync(oddsPath)) {
    try {
      existingPayload = JSON.parse(fs.readFileSync(oddsPath, "utf8"));
    } catch {
      existingPayload = { snapshots: [] };
    }
  }

  // 2. 从数据库中拉取所有 scheduled 或者是已完赛的真实联赛 fixture 做匹配
  const dbFixtures = await prisma.fixture.findMany({
    select: {
      id: true,
      league: true,
      home: true,
      away: true,
      kickoffUtc: true,
    },
  });

  const now = new Date();
  let addedCount = 0;

  // 3. 遍历各个配置的免费 CSV 联赛源
  for (const [leagueCode, csvPath] of Object.entries(LEAGUE_MAPPING)) {
    const url = `https://www.football-data.co.uk/mmz4281/${csvPath}`;
    console.log(`[CSV-Odds] Fetching ${leagueCode} odds from: ${url}`);

    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const text = await res.text();
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) continue;

      const headers = parseCSVLine(lines[0]);
      const getIndex = (name: string) => headers.indexOf(name);

      const idxDate = getIndex("Date");
      const idxHome = getIndex("HomeTeam");
      const idxAway = getIndex("AwayTeam");
      
      const idxPinnacleHome = getIndex("PSH");
      const idxPinnacleDraw = getIndex("PSD");
      const idxPinnacleAway = getIndex("PSA");
      
      const idxB365Over = getIndex("B365>2.5");
      const idxB365Under = getIndex("B365<2.5");

      // 提取最新的 30 行（约 3 轮比赛）
      const recentLines = lines.slice(-30);

      for (const line of recentLines) {
        const columns = parseCSVLine(line);
        if (columns.length <= Math.max(idxHome, idxAway, idxPinnacleAway)) continue;

        const homeTeamCsv = columns[idxHome];
        const awayTeamCsv = columns[idxAway];
        const dateCsv = columns[idxDate]; // DD/MM/YY

        const pHome = parseFloat(columns[idxPinnacleHome]);
        const pDraw = parseFloat(columns[idxPinnacleDraw]);
        const pAway = parseFloat(columns[idxPinnacleAway]);

        const bOver = parseFloat(columns[idxB365Over]);
        const bUnder = parseFloat(columns[idxB365Under]);

        if (!homeTeamCsv || !awayTeamCsv || Number.isNaN(pHome)) continue;

        // 4. 在数据库中匹配这个 fixture
        const matchedFixture = dbFixtures.find(
          (f) =>
            f.league.toUpperCase() === leagueCode.toUpperCase() &&
            isTeamMatch(f.home, homeTeamCsv) &&
            isTeamMatch(f.away, awayTeamCsv)
        );

        if (!matchedFixture) continue;

        const takenAtStr = now.toISOString();

        // 构造独赢与大小球赔率快照结构
        const newSnapshots = [
          // 1x2 Pinnacle odds
          {
            fixture_id: matchedFixture.id,
            league: matchedFixture.league,
            home: matchedFixture.home,
            away: matchedFixture.away,
            kickoff_utc: matchedFixture.kickoffUtc.toISOString(),
            book: "pinnacle",
            market: "Match Winner",
            selection: "Home",
            price: pHome,
            taken_at: takenAtStr,
          },
          {
            fixture_id: matchedFixture.id,
            league: matchedFixture.league,
            home: matchedFixture.home,
            away: matchedFixture.away,
            kickoff_utc: matchedFixture.kickoffUtc.toISOString(),
            book: "pinnacle",
            market: "Match Winner",
            selection: "Draw",
            price: pDraw,
            taken_at: takenAtStr,
          },
          {
            fixture_id: matchedFixture.id,
            league: matchedFixture.league,
            home: matchedFixture.home,
            away: matchedFixture.away,
            kickoff_utc: matchedFixture.kickoffUtc.toISOString(),
            book: "pinnacle",
            market: "Match Winner",
            selection: "Away",
            price: pAway,
            taken_at: takenAtStr,
          },
        ];

        // 增加大小球 Bet365 赔率 (若存在)
        if (!Number.isNaN(bOver)) {
          newSnapshots.push(
            {
              fixture_id: matchedFixture.id,
              league: matchedFixture.league,
              home: matchedFixture.home,
              away: matchedFixture.away,
              kickoff_utc: matchedFixture.kickoffUtc.toISOString(),
              book: "bet365",
              market: "Goals Over/Under",
              selection: "Over 2.5",
              price: bOver,
              taken_at: takenAtStr,
            },
            {
              fixture_id: matchedFixture.id,
              league: matchedFixture.league,
              home: matchedFixture.home,
              away: matchedFixture.away,
              kickoff_utc: matchedFixture.kickoffUtc.toISOString(),
              book: "bet365",
              market: "Goals Over/Under",
              selection: "Under 2.5",
              price: bUnder,
              taken_at: takenAtStr,
            }
          );
        }

        // 5. 写入原有 snapshots 列表中，去重
        for (const ns of newSnapshots) {
          const isDuplicate = existingPayload.snapshots.some(
            (es) =>
              es.fixture_id === ns.fixture_id &&
              es.book === ns.book &&
              es.market === ns.market &&
              es.selection === ns.selection &&
              Math.abs(new Date(es.taken_at).getTime() - now.getTime()) < 1000 * 60 * 10 // 10分钟内不重复创建相同的快照
          );

          if (!isDuplicate) {
            existingPayload.snapshots.push(ns);
            addedCount++;
          }
        }
      }

    } catch (e: any) {
      console.warn(`[CSV-Odds] Failed to sync ${leagueCode}:`, e.message);
    }
  }

  // 6. 写回 odds_snapshots.json 文件
  if (addedCount > 0) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(oddsPath, JSON.stringify(existingPayload, null, 2), "utf8");
    console.log(`[CSV-Odds] Successfully parsed and merged ${addedCount} new odds snapshots to local cache file.`);
  }

  await prisma.$disconnect();
}
