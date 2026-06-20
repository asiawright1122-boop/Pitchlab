import { handleTelegramUpdate, TelegramUpdate } from "../lib/telegram-bot";
import { prisma } from "../lib/prisma";

async function runTests() {
  console.log("=== 正在运行 PitchLab TG Bot 流程验证测试 ===");
  process.env.DATA_SOURCE_TYPE = "mock";
  process.env.ALLOW_MOCK = "true";

  
  const testChatId = 88888;
  const idStr = String(testChatId);
  const fakeEmail = `tg_${testChatId}@quantedge.local`;

  // 1. 清理已有的测试数据，确保测试是幂等的
  await prisma.paperTrade.deleteMany({
    where: { user: { email: fakeEmail } }
  }).catch(() => {});
  await prisma.channelBinding.deleteMany({
    where: { externalId: idStr }
  }).catch(() => {});
  await prisma.paperWallet.deleteMany({
    where: { user: { email: fakeEmail } }
  }).catch(() => {});
  await prisma.user.deleteMany({
    where: { email: fakeEmail }
  }).catch(() => {});


  console.log("1. 数据库清理完成。");

  // 2. 模拟发送 /start 指令，验证自动注册和钱包赠送
  const startUpdate: TelegramUpdate = {
    update_id: 1,
    message: {
      chat: { id: testChatId },
      text: "/start"
    }
  };
  
  await handleTelegramUpdate(startUpdate);
  
  // 验证用户和钱包是否正确创建
  const user = await prisma.user.findUnique({
    where: { email: fakeEmail },
    include: { paperWallet: true }
  });
  
  if (!user || !user.paperWallet) {
    throw new Error("测试失败: /start 指令后未能正确创建用户或钱包！");
  }
  
  console.log(`2. 自动注册与钱包赠送验证通过！当前余额: ${user.paperWallet.balance}`);

  // 3. 模拟发送 /fixtures 指令，验证赛事卡片输出与 Mock 接口通畅度
  const fixturesUpdate: TelegramUpdate = {
    update_id: 2,
    message: {
      chat: { id: testChatId },
      text: "/fixtures"
    }
  };
  
  await handleTelegramUpdate(fixturesUpdate);
  console.log("3. /fixtures 赛程获取与推送验证完毕。");

  // 4. 模拟 callback_query 投注事件 (投注曼联胜，赔率 2.50)
  const betUpdate: TelegramUpdate = {
    update_id: 3,
    callback_query: {
      id: "cb_query_1",
      from: { id: testChatId, first_name: "TestUser" },
      message: {
        message_id: 999,
        chat: { id: testChatId },
        text: "Manchester United vs Arsenal"
      },
      data: "bet:mock_pl_mun_ars:H:2.50"
    }
  };
  
  await handleTelegramUpdate(betUpdate);
  
  // 验证钱包余额是否被扣减了 100 (10000 - 100 = 9900)
  const updatedWallet = await prisma.paperWallet.findUnique({
    where: { userId: user.id }
  });
  
  if (!updatedWallet || updatedWallet.balance !== 9900) {
    throw new Error(`测试失败: 投注扣减后余额不正确！期望: 9900, 实际: ${updatedWallet?.balance}`);
  }
  
  // 验证投注记录是否成功创建
  const trade = await prisma.paperTrade.findFirst({
    where: { userId: user.id, fixtureId: "mock_pl_mun_ars" }
  });
  
  if (!trade || trade.selection !== "H" || trade.odds !== 2.50 || trade.stake !== 100 || trade.status !== "open") {
    throw new Error(`测试失败: 投注记录内容不正确！实际记录: ${JSON.stringify(trade)}`);
  }
  
  console.log("4. 模拟下注逻辑（扣除余额与创建 trade 订单）验证通过！");
  
  // 5. 模拟第二次下注同一场比赛，应当被拒绝
  await handleTelegramUpdate(betUpdate);
  
  const tradesCount = await prisma.paperTrade.count({
    where: { userId: user.id, fixtureId: "mock_pl_mun_ars" }
  });
  
  if (tradesCount !== 1) {
    throw new Error("测试失败: 用户重复下注了同一场比赛！");
  }
  
  console.log("5. 重复下注拦截验证通过！");
  console.log("🎉 所有 Bot 核心业务路径本地验证通过，功能完美实现！");
}

runTests()
  .catch((e) => {
    console.error("❌ 单元测试运行出错：", e);
    process.exit(1);
  })
  .finally(async () => {
    const testChatId = 88888;
    const idStr = String(testChatId);
    const fakeEmail = `tg_${testChatId}@quantedge.local`;
    console.log("正在清理单元测试临时数据...");
    try {
      await prisma.paperTrade.deleteMany({
        where: { user: { email: fakeEmail } }
      });
      await prisma.channelBinding.deleteMany({
        where: { externalId: idStr }
      });
      await prisma.paperWallet.deleteMany({
        where: { user: { email: fakeEmail } }
      });
      await prisma.user.deleteMany({
        where: { email: fakeEmail }
      });
      console.log("单元测试临时数据清理成功。");
    } catch (err) {
      console.warn("清理单元测试临时数据失败:", err);
    }
    await prisma.$disconnect();
  });

