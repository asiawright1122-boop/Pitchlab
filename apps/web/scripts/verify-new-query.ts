import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    console.log("当前时间:", now.toISOString());

    // Simulate the new split query from page.tsx
    const upcomingFixtures = await prisma.fixture.findMany({
      where: {
        league: "WC",
        status: { in: ["scheduled", "SCHEDULED"] },
        kickoffUtc: { gt: now },
      },
      orderBy: { kickoffUtc: "asc" },
      take: 50,
    });

    const finishedFixtures = await prisma.fixture.findMany({
      where: {
        league: "WC",
        status: { notIn: ["scheduled", "SCHEDULED"] },
      },
      orderBy: { kickoffUtc: "desc" },
      take: 30,
    });

    console.log("\n=== 新查询结果 ===");
    console.log("upcoming (scheduled + future):", upcomingFixtures.length);
    console.log("finished (recent 30):", finishedFixtures.length);
    console.log("合计传给前端:", upcomingFixtures.length + finishedFixtures.length);

    console.log("\n--- Upcoming 赛程 (前10条) ---");
    upcomingFixtures.slice(0, 10).forEach((f) => {
      console.log(`  ${f.home} vs ${f.away} | ${f.kickoffUtc.toISOString()} | status: ${f.status}`);
    });

    console.log("\n--- Finished 赛程 (前5条, 按时间倒序) ---");
    finishedFixtures.slice(0, 5).forEach((f) => {
      console.log(`  ${f.home} vs ${f.away} | ${f.kickoffUtc.toISOString()} | ${f.homeGoals}:${f.awayGoals} | status: ${f.status}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
