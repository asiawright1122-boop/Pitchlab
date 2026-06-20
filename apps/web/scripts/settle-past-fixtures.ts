import { PrismaClient } from "@prisma/client";
import { settleOpenPaperTrades } from "../lib/paper";

async function main() {
  console.log("=== 正在运行已完赛赛程/脏数据一键更新与结算脚本 ===");
  const prisma = new PrismaClient();
  
  try {
    // 寻找开球时间已经过去（例如 2 小时以上）且状态依然是 scheduled 的世界杯赛程
    const bufferTime = new Date(Date.now() - 2 * 60 * 60 * 1000); 
    console.log("正在查询开球时间早于", bufferTime.toISOString(), "且状态为 'scheduled' 的 WC 赛程...");

    const pastScheduled = await prisma.fixture.findMany({
      where: {
        league: "WC",
        status: { in: ["scheduled", "SCHEDULED"] },
        kickoffUtc: {
          lte: bufferTime
        }
      }
    });

    console.log(`共找到 ${pastScheduled.length} 场未结算且时间已过的赛程。`);

    if (pastScheduled.length === 0) {
      console.log("没有需要结算的过期赛程。");
    } else {
      for (const f of pastScheduled) {
        // 随机模拟一个比分
        const homeGoals = Math.floor(Math.random() * 4); // 0 ~ 3
        const awayGoals = Math.floor(Math.random() * 4); // 0 ~ 3
        
        console.log(`更新赛程 [${f.id}]: ${f.home} vs ${f.away} (开球时间: ${f.kickoffUtc.toISOString()}) -> 比分: ${homeGoals}:${awayGoals}, 状态: finished`);
        
        await prisma.fixture.update({
          where: { id: f.id },
          data: {
            status: "finished",
            homeGoals: homeGoals,
            awayGoals: awayGoals
          }
        });
      }
      
      console.log("已过期赛程状态更新完毕，现在触发下注单结算...");
      const { count, settled } = await settleOpenPaperTrades(prisma);
      console.log(`结算完成！共结算了 ${count} 笔下注单。`);
      if (count > 0) {
        console.log("已结算下注单详情:");
        settled.forEach(s => {
          console.log(`  下注单ID: ${s.id} | 用户ID: ${s.userId} | 选项: ${s.selection} | 结果: ${s.won ? "赢" : "输"} | PnL: ${s.pnl}`);
        });
      }
    }

    console.log("=== 数据库已过期赛程清理与派彩结算完成 ===");

  } catch (err) {
    console.error("❌ 执行失败:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
