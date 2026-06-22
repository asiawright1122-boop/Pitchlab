import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/DashboardClient";
import { SyncService } from "@/lib/services/sync-service";

export const dynamic = "force-dynamic";

export default async function TmaAppPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Check if we've synced any fixtures today (based on updatedAt)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const recentSync = await prisma.fixture.findFirst({
    where: {
      updatedAt: {
        gte: startOfToday
      }
    }
  });

  // If no fixtures were synced today, force a live fetch from API-Football
  if (!recentSync) {
    try {
      console.log("[AutoSync] No fixtures synced today. Triggering auto-sync for: ", todayStr);
      const syncService = new SyncService();
      await syncService.syncDate(todayStr);
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
      predictions: true
    },
    orderBy: { kickoffUtc: "asc" },
    take: 200,
  });

  return <DashboardClient initialFixtures={fixtures} />;
}
