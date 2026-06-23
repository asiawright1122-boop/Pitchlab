import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/DashboardClient";
import { SyncService } from "@/lib/services/sync-service";

export const dynamic = "force-dynamic";

export default async function TmaAppPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

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
}
