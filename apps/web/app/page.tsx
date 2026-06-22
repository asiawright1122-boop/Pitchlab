import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function TmaAppPage() {
  const today = new Date();
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
    orderBy: { kickoffUtc: "asc" },
    take: 200,
  });

  return <DashboardClient initialFixtures={fixtures} />;
}
