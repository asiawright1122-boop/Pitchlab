import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function TmaAppPage() {
  const fixtures = await prisma.fixture.findMany({
    where: { status: "scheduled" },
    orderBy: { kickoffUtc: "asc" },
    take: 50, // fetch more for the client to potentially filter
  });

  return <DashboardClient initialFixtures={fixtures} />;
}
