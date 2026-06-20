/**
 * 为所有缺赔率的 upcoming 赛程生成基于 Elo 排名的估算赔率
 * 使用 FIFA 排名差转换为胜率的简化模型
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 简化版 FIFA/Elo 评分 (大致参考 2026 年初排名)
const TEAM_STRENGTH: Record<string, number> = {
  // Tier 1 (1800+)
  "Brazil": 1920, "France": 1900, "Argentina": 1890, "England": 1880,
  "Germany": 1860, "Spain": 1850, "Portugal": 1840, "Netherlands": 1830,
  "Belgium": 1820, "Italy": 1810, "Colombia": 1800,
  // Tier 2 (1700-1800)
  "Croatia": 1790, "Uruguay": 1780, "United States": 1770, "Mexico": 1760,
  "Switzerland": 1750, "Japan": 1740, "South Korea": 1730, "Senegal": 1720,
  "Morocco": 1710, "Denmark": 1700, "Turkey": 1700,
  // Tier 3 (1600-1700)
  "Austria": 1690, "Scotland": 1680, "Australia": 1670, "Ecuador": 1660,
  "Norway": 1660, "Sweden": 1650, "Algeria": 1640, "Tunisia": 1630,
  "Czechia": 1620, "Canada": 1610, "Ivory Coast": 1600,
  // Tier 4 (1500-1600)
  "Ghana": 1590, "Cameroon": 1580, "Paraguay": 1570, "Panama": 1550,
  "Qatar": 1540, "Iraq": 1530, "South Africa": 1520, "Saudi Arabia": 1520,
  "Iran": 1510, "Egypt": 1500, "Uzbekistan": 1500, "Haiti": 1480,
  "Jordan": 1480, "Bosnia-Herzegovina": 1490,
  // Tier 5 (<1500)
  "New Zealand": 1460, "Congo DR": 1440, "Cape Verde Islands": 1430,
  "Curaçao": 1400, "Curacao": 1400, "Cura-ao": 1400, "Trinidad And Tobago": 1390,
};

function getStrength(name: string): number {
  // Try exact match first, then fuzzy
  if (TEAM_STRENGTH[name]) return TEAM_STRENGTH[name];
  // Try case-insensitive partial match
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(TEAM_STRENGTH)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return val;
    }
  }
  return 1500; // Default mid-tier
}

function eloToProbs(homeElo: number, awayElo: number) {
  const diff = homeElo - awayElo;
  // Home advantage bonus ~65 Elo points
  const adjustedDiff = diff + 65;
  
  // Expected score from Elo
  const homeWinProb = 1 / (1 + Math.pow(10, -adjustedDiff / 400));
  
  // Allocate draw probability based on how close the match is
  const drawFactor = 0.28 * Math.exp(-Math.abs(adjustedDiff) / 250);
  
  let h = homeWinProb * (1 - drawFactor);
  let d = drawFactor;
  let a = (1 - homeWinProb) * (1 - drawFactor);
  
  // Normalize
  const total = h + d + a;
  h /= total;
  d /= total;
  a /= total;
  
  return { home: h, draw: d, away: a };
}

async function main() {
  console.log("=== 为缺赔率的 upcoming 赛程生成 Elo 估算赔率 ===");
  const now = new Date();

  const fixtures = await prisma.fixture.findMany({
    where: {
      league: "WC",
      status: { in: ["scheduled", "SCHEDULED"] },
      kickoffUtc: { gt: now },
    },
    include: { oddsSnapshots: true },
    orderBy: { kickoffUtc: "asc" },
  });

  let generated = 0;
  const takenAt = new Date();
  const MARGIN = 0.05;

  for (const f of fixtures) {
    if (f.oddsSnapshots.length > 0) continue; // Already has odds

    const homeStr = getStrength(f.home);
    const awayStr = getStrength(f.away);
    const probs = eloToProbs(homeStr, awayStr);

    const probToOdds = (p: number) => Math.round((1 / p) * (1 + MARGIN) * 100) / 100;

    const snapshots = [
      { sel: "home", price: probToOdds(probs.home) },
      { sel: "draw", price: probToOdds(probs.draw) },
      { sel: "away", price: probToOdds(probs.away) },
    ];

    for (const s of snapshots) {
      try {
        await prisma.oddsSnapshot.create({
          data: {
            fixtureId: f.id,
            book: "pitchlab-elo",
            market: "1x2",
            selection: s.sel,
            price: s.price,
            takenAt,
          },
        });
        generated++;
      } catch {
        // duplicate
      }
    }

    console.log(
      `  ${f.home.padEnd(22)} vs ${f.away.padEnd(22)} | Elo: ${homeStr}/${awayStr} | ` +
      `${snapshots[0].price}/${snapshots[1].price}/${snapshots[2].price}`
    );
  }

  console.log(`\n=== 完成: 共生成 ${generated} 条 Elo 模型赔率 ===`);
  await prisma.$disconnect();
}

main();
