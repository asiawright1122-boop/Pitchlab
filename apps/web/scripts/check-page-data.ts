import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    console.log("当前时间:", now.toISOString());

    // 1. 查找所有 scheduled 且开球时间已过的赛程（脏数据）
    const staleScheduled = await prisma.fixture.findMany({
      where: {
        league: "WC",
        status: { in: ["scheduled", "SCHEDULED"] },
        kickoffUtc: { lte: now },
      },
      orderBy: { kickoffUtc: "asc" },
    });
    console.log("\n=== 过期的 scheduled 赛程（脏数据）===");
    console.log("数量:", staleScheduled.length);
    staleScheduled.forEach((f) => {
      console.log(`  [脏] ${f.id} | ${f.kickoffUtc.toISOString()} | status: ${f.status}`);
    });

    // 2. 已完赛总数
    const allFinished = await prisma.fixture.findMany({
      where: { league: "WC", status: "finished" },
    });
    console.log("\n=== 已完赛赛程总数 ===");
    console.log("数量:", allFinished.length);

    // 3. 模拟页面查询
    const pageResults = await prisma.fixture.findMany({
      where: {
        league: "WC",
        NOT: {
          AND: [
            { status: { in: ["scheduled", "SCHEDULED"] } },
            { kickoffUtc: { lte: now } },
          ],
        },
      },
      orderBy: { kickoffUtc: "asc" },
      take: 50,
    });

    const finInPage = pageResults.filter((f) => f.status === "finished");
    const upInPage = pageResults.filter((f) => f.status !== "finished");

    console.log("\n=== 页面查询返回 ===");
    console.log("总条数:", pageResults.length);
    console.log("finished:", finInPage.length);
    console.log("upcoming/scheduled:", upInPage.length);

    console.log("\n前15条:");
    pageResults.slice(0, 15).forEach((f) => {
      console.log(`  [${f.status.padEnd(10)}] ${f.id} | ${f.kickoffUtc.toISOString()}`);
    });

    console.log("\n后10条:");
    pageResults.slice(-10).forEach((f) => {
      console.log(`  [${f.status.padEnd(10)}] ${f.id} | ${f.kickoffUtc.toISOString()}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
