import { prisma } from "@/lib/prisma";
import { MyTeamsClient } from "@/components/MyTeamsClient";

export default async function MyTeamsPage() {
  const fixtures = await prisma.fixture.findMany({
    where: { status: "scheduled" },
    orderBy: { kickoffUtc: "asc" },
  });

  return <MyTeamsClient allFixtures={fixtures} />;
}
