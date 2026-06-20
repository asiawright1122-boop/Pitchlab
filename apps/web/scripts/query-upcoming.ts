import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const futureCount = await prisma.fixture.count({
      where: {
        kickoffUtc: {
          gte: new Date(),
        }
      }
    });
    console.log("Upcoming fixtures count in DB:", futureCount);
    if (futureCount > 0) {
      const samples = await prisma.fixture.findMany({
        where: {
          kickoffUtc: {
            gte: new Date(),
          }
        },
        take: 3
      });
      console.log("Samples:", samples);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
