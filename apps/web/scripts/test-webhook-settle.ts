import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("=== 正在运行 Webhook 实时回调结算功能测试 ===");
  const prisma = new PrismaClient();
  
  const testUserId = "test-user-webhook-999";
  const testFixtureId = "test-fixture-webhook-999";
  
  try {
    // 1. 初始化测试数据
    await prisma.paperTrade.deleteMany({ where: { userId: testUserId } });
    await prisma.paperWallet.deleteMany({ where: { userId: testUserId } });
    await prisma.fixture.deleteMany({ where: { id: testFixtureId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    // 创建测试用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: "webhook-tester@pitchlab.ai",
      }
    });

    // 初始化钱包余额为 1000
    await prisma.paperWallet.create({
      data: {
        userId: testUserId,
        balance: 1000,
      }
    });

    // 创建一个 scheduled 的赛程
    await prisma.fixture.create({
      data: {
        id: testFixtureId,
        league: "39",
        home: "Webhook FC",
        away: "Realtime City",
        kickoffUtc: new Date(),
        status: "scheduled",
      }
    });

    // 创建一笔针对该赛程的 open 投注，选项为 "H"，本金为 100，赔率 2.5
    const trade = await prisma.paperTrade.create({
      data: {
        userId: testUserId,
        fixtureId: testFixtureId,
        league: "39",
        home: "Webhook FC",
        away: "Realtime City",
        kickoffUtc: new Date(),
        selection: "H",
        odds: 2.5,
        stake: 100,
        status: "open",
      }
    });

    console.log("测试数据初始化成功！投注单ID:", trade.id);

    // 2. 发起 Webhook 请求 (这里我们直接在本地发 POST 请求)
    // 模拟足球 API 服务商推送 Webhook 数据，宣称 Webhook FC 2:1 击败 Realtime City，且比赛已结束
    console.log("正在向本地 Webhook 接口发送比赛事件回调数据...");
    
    const url = "http://localhost:3000/api/fixtures/webhook";
    const payload = {
      fixtureId: testFixtureId,
      status: "FT", // 已完赛
      homeGoals: 2,
      awayGoals: 1
    };

    // 因为是在测试脚本里请求本地服务，确保 Next.js 开发服务器正在 3000 端口运行
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 如果环境变量有 WEBHOOK_TOKEN，在此可以传入对应的 token 鉴权
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook 请求失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Webhook 接口响应结果:", result);

    // 3. 断言校验
    if (!result.success) {
      throw new Error("Webhook 接口返回 success 为 false");
    }

    if (result.settledCount !== 1) {
      throw new Error(`预期结算 1 笔下注单，但实际结算了: ${result.settledCount}`);
    }

    // 从数据库中拉取最新的投注单状态，检验是否结算为 won (因为主胜 Webhook FC 2:1 赢了，且投的是 H)
    const settledTrade = await prisma.paperTrade.findUnique({
      where: { id: trade.id }
    });

    if (!settledTrade) {
      throw new Error("未能在数据库中找到该投注记录");
    }

    console.log("数据库中结算后投注单状态:", settledTrade);
    if (settledTrade.status !== "won") {
      throw new Error(`预期投注单状态应为 'won'，实际为: ${settledTrade.status}`);
    }

    // 赔率 2.5，本金 100，PnL 应为 150
    if (settledTrade.pnl !== 150) {
      throw new Error(`预期 PnL 为 150 (100 * 2.5 - 100)，实际为: ${settledTrade.pnl}`);
    }

    // 钱包余额验证：初始 1000 - 100(下注扣除已在下注时处理，此处仅需验证增量)。
    // 等一下，模拟下注时会减 balance，在结算时 won 会 increment 250 (Math.round(100 * 2.5))。
    // 我们检查一下当前钱包余额。
    const wallet = await prisma.paperWallet.findUnique({
      where: { userId: testUserId }
    });
    console.log("数据库中结算后钱包余额:", wallet?.balance);
    if (!wallet || wallet.balance !== 1250) {
      throw new Error(`预期结算后余额为 1250 (1000 + 250 派彩)，实际为: ${wallet?.balance}`);
    }

    console.log("🎉 Webhook 实时回调即时结算接口测试全部成功！");

  } catch (error) {
    console.error("❌ 测试失败: ", error);
    process.exit(1);
  } finally {
    // 4. 清理测试数据
    try {
      await prisma.paperTrade.deleteMany({ where: { userId: testUserId } });
      await prisma.paperWallet.deleteMany({ where: { userId: testUserId } });
      await prisma.fixture.deleteMany({ where: { id: testFixtureId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch {}
    await prisma.$disconnect();
  }
}

main();
