import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing TMA Insights API ===");

  // 1. 获取第一个用户
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("❌ No user found. Please run npm run db:seed first.");
    return;
  }
  console.log(`✓ Found User: ${user.email} (${user.id})`);

  // 2. 获取第一个赛事
  const fixture = await prisma.fixture.findFirst({
    include: {
      predictions: true,
      oddsSnapshots: true,
    }
  });
  if (!fixture) {
    console.error("❌ No fixture found. Please run npm run db:sync first.");
    return;
  }
  console.log(`✓ Found Fixture: ${fixture.home} vs ${fixture.away} (${fixture.id})`);

  // 3. 确保已经解锁
  const unlock = await prisma.matchUnlock.upsert({
    where: {
      userId_fixtureId: {
        userId: user.id,
        fixtureId: fixture.id,
      }
    },
    update: {},
    create: {
      userId: user.id,
      fixtureId: fixture.id,
    }
  });
  console.log(`✓ MatchUnlock active:`, unlock);

  // 4. 发送 POST 请求测试 API
  console.log("Sending POST request to /api/tma/insights...");
  try {
    const res = await fetch("http://localhost:3000/api/tma/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fixtureId: fixture.id }),
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Fetch error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
