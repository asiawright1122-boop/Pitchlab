import { PrismaClient } from "@prisma/client";
import { ApiFootballProvider } from "../lib/providers/api-football";

const prisma = new PrismaClient();

async function main() {
  console.log("=== 开始执行 API-Football 真实波胆赔率批量同步 ===");
  const now = new Date();
  
  // 1. 查找所有未开始且 ID 为纯数字的真实比赛
  const upcomingRealFixtures = await prisma.fixture.findMany({
    where: {
      status: { in: ["scheduled", "SCHEDULED"] }
    }
  });

  const targetFixtures = upcomingRealFixtures.filter(f => !Number.isNaN(Number(f.id)));
  console.log(`找到 ${targetFixtures.length} 场在数据库中的纯数字 ID 赛事。`);

  if (targetFixtures.length === 0) {
    console.log("暂无需要同步的真实数字 ID 赛事，同步结束。");
    return;
  }

  const provider = new ApiFootballProvider();

  for (const fixture of targetFixtures) {
    console.log(`\n正在同步: [${fixture.id}] ${fixture.home} vs ${fixture.away}...`);
    try {
      const response = await provider.fetchOddsByFixture(fixture.id);
      if (response && response.length > 0) {
        // 优先使用 Pinnacle，否则使用其返回的第一个 bookmaker
        const bookmaker = response[0].bookmakers.find(b => b.id === 17) || response[0].bookmakers[0];
        if (bookmaker) {
          const snapshotsData = [];
          let csCount = 0;

          for (const bet of bookmaker.bets) {
            for (const val of bet.values) {
              const price = parseFloat(val.odd);
              if (Number.isNaN(price)) continue;

              const isCorrectScore = bet.name === "Correct Score";
              if (isCorrectScore) csCount++;

              snapshotsData.push({
                fixtureId: fixture.id,
                book: bookmaker.name.toLowerCase(),
                market: bet.name,
                selection: val.value,
                price,
                takenAt: new Date(),
              });
            }
          }

          if (snapshotsData.length > 0) {
            await prisma.oddsSnapshot.createMany({
              data: snapshotsData,
              skipDuplicates: true,
            });
            console.log(`✅ 同步成功！写入 ${snapshotsData.length} 条真实赔率 (其中包含 ${csCount} 条精确波胆赔率)`);
          }
        }
      } else {
        console.log(`ℹ️ API 没有返回本场比赛的实时赔率数据。`);
      }
    } catch (err: any) {
      console.error(`❌ 同步失败:`, err.message);
    }
    // 稍微延迟 1 秒，防止 API 请求频率限制 (Rate Limit)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await prisma.$disconnect();
  console.log("\n=== 批量同步执行完毕 ===");
}

main();
