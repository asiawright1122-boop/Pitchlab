import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/DashboardClient";
import { SyncService } from "@/lib/services/sync-service";

export const dynamic = "force-dynamic";

export default async function TmaAppPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    // 判断最近一条赛事的更新时间是否早于 15 分钟前（或者没有数据），以此为依据进行自动同步
    const latestFixture = await prisma.fixture.findFirst({
      orderBy: { updatedAt: "desc" }
    });

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const needsSync = !latestFixture || latestFixture.updatedAt < fifteenMinutesAgo;

    if (needsSync) {
      try {
        console.log("[AutoSync] Fixtures data expired or missing. Triggering auto-sync for today:", todayStr);
        const syncService = new SyncService();
        // 同步今天
        await syncService.syncDate(todayStr);
        
        // 同步明天
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        console.log("[AutoSync] Triggering auto-sync for tomorrow:", tomorrowStr);
        await syncService.syncDate(tomorrowStr);
      } catch (e) {
        console.error("[AutoSync] Failed to auto sync fixtures:", e);
      }
    }

    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 3);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 7);

    const fixtures = await prisma.fixture.findMany({
      where: { 
        kickoffUtc: {
          gte: pastDate,
          lte: futureDate
        }
      },
      include: {
        predictions: true,
        oddsSnapshots: {
          orderBy: { takenAt: "desc" },
          take: 12 // 拉取多条以备内存筛选不同 selection (home, draw, away) 的最新价格
        }
      },
      orderBy: { kickoffUtc: "asc" },
      take: 200,
    });

    return <DashboardClient initialFixtures={fixtures as any} />;
  } catch (err) {
    console.error("[Database Connection Error]", err);
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7] items-center justify-center p-6 text-center select-none font-sans">
        <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm flex flex-col items-center gap-4.5 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 text-lg animate-pulse">
            ⚡
          </div>
          <h2 className="text-xs font-black text-gray-800 uppercase tracking-widest">Network Congestion</h2>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            The remote database connection is currently establishing. Please perform a manual pull-to-refresh or tap reload to retry.
          </p>
          <p className="text-[10px] text-gray-500 font-extrabold leading-relaxed mt-1">
            云端数据库连接可能有些许波动或初次冷启动延迟，请您手动点击浏览器刷新重试。
          </p>
        </div>
      </div>
    );
  }
}
