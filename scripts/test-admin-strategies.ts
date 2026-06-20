import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testEndpoint(url: string, method: string, token: string | null, body: any = null) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: res.status,
    data: await res.json().catch(() => null),
  };
}

async function main() {
  console.log("=== Testing Admin Access to User Strategies ===");

  const adminSecret = process.env.ADMIN_SECRET || "pitchlab_dev_admin_secret_123";

  // 1. Get a user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("❌ No user found. Run db:seed or db:sync first.");
    return;
  }
  console.log(`✓ Testing target user: ${user.email} (${user.id})`);

  // 2. Ensure a test strategy exists for this user
  let strategy = await prisma.userStrategy.findFirst({ where: { userId: user.id } });
  if (!strategy) {
    console.log("Creating a temporary strategy for testing...");
    strategy = await prisma.userStrategy.create({
      data: {
        userId: user.id,
        name: "Temporary Admin Test Strategy",
        rules: { min_edge: 0.05, leagues: ["E0"] },
        notify: false,
      }
    });
  }
  console.log(`✓ Active test strategy: ${strategy.name} (${strategy.id})`);

  // 3. Test querying strategies as unauthorized
  console.log("\n[Test 1] Unauthorized fetch of target user's strategies...");
  const unauthGet = await testEndpoint(`/api/strategies?userId=${user.id}`, "GET", null);
  if (unauthGet.status === 401) {
    console.log("✓ Success: Request without token was blocked with 401.");
  } else {
    console.error(`❌ Fail: Expected 401, got ${unauthGet.status}`, unauthGet.data);
  }

  // 4. Test querying strategies as admin
  console.log("\n[Test 2] Admin fetching target user's strategies...");
  const adminGet = await testEndpoint(`/api/strategies?userId=${user.id}`, "GET", adminSecret);
  if (adminGet.status === 200 && Array.isArray(adminGet.data?.strategies)) {
    const found = adminGet.data.strategies.find((s: any) => s.id === strategy.id);
    if (found) {
      console.log(`✓ Success: Admin fetched ${adminGet.data.strategies.length} strategies, found target strategy: ${found.name}`);
    } else {
      console.error("❌ Fail: Target strategy not in returned list", adminGet.data);
    }
  } else {
    console.error(`❌ Fail: Expected 200, got ${adminGet.status}`, adminGet.data);
  }

  // 5. Test unauthorized delete
  console.log("\n[Test 3] Unauthorized deletion of target strategy...");
  const unauthDel = await testEndpoint(`/api/strategies/${strategy.id}`, "DELETE", null);
  if (unauthDel.status === 401) {
    console.log("✓ Success: Unauthorized deletion was blocked with 401.");
  } else {
    console.error(`❌ Fail: Expected 401, got ${unauthDel.status}`, unauthDel.data);
  }

  // 6. Test admin delete
  console.log("\n[Test 4] Admin deleting target strategy...");
  const adminDel = await testEndpoint(`/api/strategies/${strategy.id}`, "DELETE", adminSecret);
  if (adminDel.status === 200 && adminDel.data?.ok) {
    console.log("✓ Success: Strategy deleted successfully by admin.");
  } else {
    console.error(`❌ Fail: Expected 200, got ${adminDel.status}`, adminDel.data);
  }

  // 7. Verify deletion by querying again
  console.log("\n[Test 5] Verify target strategy is no longer returned...");
  const adminGetAfter = await testEndpoint(`/api/strategies?userId=${user.id}`, "GET", adminSecret);
  if (adminGetAfter.status === 200 && Array.isArray(adminGetAfter.data?.strategies)) {
    const found = adminGetAfter.data.strategies.find((s: any) => s.id === strategy.id);
    if (!found) {
      console.log("✓ Success: Target strategy is no longer returned.");
    } else {
      console.error("❌ Fail: Strategy still exists in returned list", adminGetAfter.data);
    }
  } else {
    console.error(`❌ Fail: Expected 200, got ${adminGetAfter.status}`, adminGetAfter.data);
  }

  console.log("\n=== Admin user strategy API tests completed ===");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
