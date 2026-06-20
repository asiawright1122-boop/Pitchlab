import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    console.log("Current System Time (now):", now.toISOString());

    // 1. Original style query
    const fixtures1 = await prisma.fixture.findMany({
      where: {
        league: "WC",
        NOT: {
          status: { in: ["scheduled", "SCHEDULED"] },
          kickoffUtc: {
            lte: now,
          },
        },
      },
      orderBy: { kickoffUtc: "asc" },
      take: 20,
    });
    console.log(`Original query returns ${fixtures1.length} matches. Sample id:`);
    fixtures1.forEach(f => {
      if (new Date(f.kickoffUtc) < now && f.status === "scheduled") {
        console.log(`  [DANGER] ${f.id} | ${f.kickoffUtc.toISOString()} | status: ${f.status} (This should have been filtered!)`);
      } else {
        console.log(`  [OK] ${f.id} | ${f.kickoffUtc.toISOString()} | status: ${f.status}`);
      }
    });

    // 2. Explicit AND style query
    const fixtures2 = await prisma.fixture.findMany({
      where: {
        league: "WC",
        NOT: {
          AND: [
            { status: { in: ["scheduled", "SCHEDULED"] } },
            { kickoffUtc: { lte: now } }
          ]
        }
      },
      orderBy: { kickoffUtc: "asc" },
      take: 20,
    });
    console.log(`\nExplicit AND query returns ${fixtures2.length} matches. Sample id:`);
    fixtures2.forEach(f => {
      if (new Date(f.kickoffUtc) < now && f.status === "scheduled") {
        console.log(`  [DANGER] ${f.id} | ${f.kickoffUtc.toISOString()} | status: ${f.status} (This should have been filtered!)`);
      } else {
        console.log(`  [OK] ${f.id} | ${f.kickoffUtc.toISOString()} | status: ${f.status}`);
      }
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
