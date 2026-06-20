import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const wcFixtures = await prisma.fixture.findMany({
      where: {
        league: "WC",
        kickoffUtc: {
          lte: new Date("2026-06-17T23:59:59Z")
        }
      },
      orderBy: {
        kickoffUtc: "asc"
      }
    });

    console.log(`Found ${wcFixtures.length} WC fixtures up to June 17, 2026:`);
    wcFixtures.forEach((f) => {
      console.log(`[${f.id}] Kickoff: ${f.kickoffUtc.toISOString()} | ${f.home} vs ${f.away} | Status: ${f.status} | Score: ${f.homeGoals}:${f.awayGoals}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();




