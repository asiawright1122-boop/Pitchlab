/**
 * 为 upcoming 赛程根据 Dixon-Coles 模型预测概率生成赔率快照
 * 公式: odds = 1 / prob * (1 + margin)
 * margin = 0.05 (模拟 5% 庄家水位)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARGIN = 0.05;

async function main() {
  console.log("=== 根据 Dixon-Coles 预测为 upcoming 赛程生成模型赔率 ===");
  const now = new Date();

  // 查找有 predictions 但没有 oddsSnapshots 的 upcoming fixtures
  const fixtures = await prisma.fixture.findMany({
    where: {
      league: "WC",
      status: { in: ["scheduled", "SCHEDULED"] },
      kickoffUtc: { gt: now },
    },
    include: {
      predictions: true,
      oddsSnapshots: true,
    },
    orderBy: { kickoffUtc: "asc" },
  });

  let generated = 0;
  const takenAt = new Date();

  for (const f of fixtures) {
    // Skip if already has odds
    if (f.oddsSnapshots.length > 0) {
      continue;
    }

    // Find 1x2 predictions
    const homePred = f.predictions.find(p => p.market === "1X2" && p.selection === "H");
    const drawPred = f.predictions.find(p => p.market === "1X2" && p.selection === "D");
    const awayPred = f.predictions.find(p => p.market === "1X2" && p.selection === "A");

    if (!homePred && !drawPred && !awayPred) {
      // No predictions at all, skip
      continue;
    }

    const probToOdds = (prob: number) => {
      if (prob <= 0) return 99.0;
      return Math.round((1 / prob) * (1 + MARGIN) * 100) / 100;
    };

    const snapshots = [];
    if (homePred) {
      snapshots.push({ sel: "home", price: probToOdds(homePred.prob) });
    }
    if (drawPred) {
      snapshots.push({ sel: "draw", price: probToOdds(drawPred.prob) });
    }
    if (awayPred) {
      snapshots.push({ sel: "away", price: probToOdds(awayPred.prob) });
    }

    for (const s of snapshots) {
      try {
        await prisma.oddsSnapshot.create({
          data: {
            fixtureId: f.id,
            book: "dixon-coles",
            market: "1x2",
            selection: s.sel,
            price: s.price,
            takenAt,
          },
        });
        generated++;
      } catch {
        // duplicate, skip
      }
    }

    console.log(
      `  ${f.home} vs ${f.away} | ` +
      snapshots.map(s => `${s.sel}: ${s.price}`).join(", ")
    );
  }

  console.log(`\n=== 完成: 共生成 ${generated} 条模型赔率快照 ===`);
  await prisma.$disconnect();
}

main();
