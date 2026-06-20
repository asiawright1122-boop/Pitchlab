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
  console.log("=== Testing PitchLab Admin APIs & Security ===");

  const adminSecret = process.env.ADMIN_SECRET || "pitchlab_dev_admin_secret_123";

  // 1. 测试未授权拦截
  console.log("\n[Test 1] Unauthorized interception...");
  const authErrTest = await testEndpoint("/api/admin/users", "GET", null);
  if (authErrTest.status === 401) {
    console.log("✓ Success: Request without token was blocked with 401.");
  } else {
    console.error(`❌ Fail: Expected 401, got ${authErrTest.status}`);
  }

  const badTokenTest = await testEndpoint("/api/admin/users", "GET", "wrong_secret");
  if (badTokenTest.status === 401) {
    console.log("✓ Success: Request with bad token was blocked with 401.");
  } else {
    console.error(`❌ Fail: Expected 401, got ${badTokenTest.status}`);
  }

  // 2. 测试获取用户列表
  console.log("\n[Test 2] Fetch users list...");
  const usersRes = await testEndpoint("/api/admin/users", "GET", adminSecret);
  if (usersRes.status === 200 && Array.isArray(usersRes.data?.users)) {
    console.log(`✓ Success: Fetched ${usersRes.data.users.length} users successfully.`);
  } else {
    console.error("❌ Fail:", usersRes);
  }

  // 3. 测试队名对齐字典 API
  console.log("\n[Test 3] Names Registry API...");
  // 添加别名对齐
  const addAliasRes = await testEndpoint("/api/admin/names-registry", "POST", adminSecret, {
    action: "add",
    canonicalName: "Manchester United",
    alias: "Man Utd DevTest"
  });
  if (addAliasRes.status === 200 && addAliasRes.data?.success) {
    console.log("✓ Success: Added name alias mapping successfully.");
  } else {
    console.error("❌ Fail:", addAliasRes);
  }

  // 读取检查
  const getRegRes = await testEndpoint("/api/admin/names-registry", "GET", adminSecret);
  if (getRegRes.status === 200 && getRegRes.data?.registry?.["Manchester United"]?.includes("Man Utd DevTest")) {
    console.log("✓ Success: Alias is correctly saved in names_registry.json.");
  } else {
    console.error("❌ Fail:", getRegRes);
  }

  // 删除别名
  const delAliasRes = await testEndpoint("/api/admin/names-registry", "POST", adminSecret, {
    action: "delete",
    canonicalName: "Manchester United",
    alias: "Man Utd DevTest"
  });
  if (delAliasRes.status === 200 && delAliasRes.data?.success) {
    console.log("✓ Success: Deleted name alias mapping successfully.");
  } else {
    console.error("❌ Fail:", delAliasRes);
  }

  // 4. 测试模型晋升配置 API
  console.log("\n[Test 4] Promotion Policy API...");
  // 写入配置
  const savePolicyRes = await testEndpoint("/api/admin/promotion-policy", "POST", adminSecret, {
    auto_promote: false,
    eval_days: 60,
    min_snapshots: 5,
    clv_threshold: -0.01,
    brier_check: false
  });
  if (savePolicyRes.status === 200 && savePolicyRes.data?.success) {
    console.log("✓ Success: Saved promotion policy successfully.");
  } else {
    console.error("❌ Fail:", savePolicyRes);
  }

  // 读取配置
  const getPolicyRes = await testEndpoint("/api/admin/promotion-policy", "GET", adminSecret);
  if (getPolicyRes.status === 200 && getPolicyRes.data?.policy?.auto_promote === false) {
    console.log("✓ Success: Promotion policy correctly saved and read back from DB:", getPolicyRes.data.policy);
  } else {
    console.error("❌ Fail:", getPolicyRes);
  }

  // 还原默认配置以便本地环境正常测试
  await testEndpoint("/api/admin/promotion-policy", "POST", adminSecret, {
    auto_promote: true,
    eval_days: 90,
    min_snapshots: 7,
    clv_threshold: 0.0,
    brier_check: true
  });
  console.log("✓ Restored default promotion policy configuration.");

  console.log("\n=== All admin API tests completed ===");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
