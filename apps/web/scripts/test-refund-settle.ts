import { PrismaClient } from "@prisma/client";
import { settleOpenPaperTrades } from "../lib/paper";

async function main() {
  console.log("=== 正在运行异常比赛自动退款结算测试 ===");
  const prisma = new PrismaClient();
  
  const testUserId = "test-user-refund-123";
  const testFixtureId = "test-fixture-refund-123";
  
  try {
    // 1. 初始化测试数据
    // 清理可能存在的旧测试数据
    await prisma.paperTrade.deleteMany({ where: { userId: testUserId } });
    await prisma.paperWallet.deleteMany({ where: { userId: testUserId } });
    await prisma.fixture.deleteMany({ where: { id: testFixtureId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    // 创建测试用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: "refund-tester@pitchlab.ai",
      }
    });

    // 初始化钱包余额为 1000
    await prisma.paperWallet.create({
      data: {
        userId: testUserId,
        balance: 1000,
      }
    });

    // 创建一个已推迟 (POSTPONED) 的赛程
    await prisma.fixture.create({
      data: {
        id: testFixtureId,
        league: "39", // Premier League
        home: "Refund FC",
        away: "Void City",
        kickoffUtc: new Date(),
        status: "POSTPONED", // 退款状态之一
      }
    });

    // 创建一笔针对该赛程的 open 投注，本金为 150，赔率 2.0，选项为 "H"
    const trade = await prisma.paperTrade.create({
      data: {
        userId: testUserId,
        fixtureId: testFixtureId,
        league: "39",
        home: "Refund FC",
        away: "Void City",
        kickoffUtc: new Date(),
        selection: "H",
        odds: 2.0,
        stake: 150,
        status: "open",
      }
    });

    console.log("测试投注单创建成功:", trade);

    // 2. 执行结算
    const { count, settled } = await settleOpenPaperTrades(prisma, testUserId);
    console.log(`结算处理完成，数量: ${count}`);
    console.log("结算结果数据:", settled);

    // 3. 断言校验
    if (count !== 1) {
      throw new Error(`预期结算 1 笔交易，实际结算了: ${count}`);
    }

    const settledTrade = await prisma.paperTrade.findUnique({
      where: { id: trade.id }
    });

    if (!settledTrade) {
      throw new Error("未能找到结算后的投注记录");
    }

    console.log("结算后投注单状态:", settledTrade);
    if (settledTrade.status !== "void") {
      throw new Error(`预期投注单状态为 'void'，实际为: ${settledTrade.status}`);
    }

    if (settledTrade.pnl !== 0) {
      throw new Error(`预期 PnL 为 0，实际为: ${settledTrade.pnl}`);
    }

    // 校验钱包余额
    const wallet = await prisma.paperWallet.findUnique({
      where: { userId: testUserId }
    });

    if (!wallet) {
      throw new Error("未找到测试用户的钱包");
    }

    console.log("结算后钱包余额:", wallet.balance);
    // 初始 1000，退款 150，所以应该为 1150
    if (wallet.balance !== 1150) {
      throw new Error(`预期钱包余额为 1150 (1000 + 150 退款)，实际为: ${wallet.balance}`);
    }

    console.log("🎉 异常比赛自动退款结算机制测试成功！");

  } catch (error) {
    console.error("❌ 测试失败: ", error);
    process.exit(1);
  } finally {
    // 清理测试数据
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
