import { handleTelegramUpdate, TelegramUpdate } from "../lib/telegram-bot";
import { prisma } from "../lib/prisma";

// 保存原始全局 fetch
const originalFetch = global.fetch;

function mockGeminiFetch() {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = input.toString();

    // 拦截 TG 消息，打印到控制台
    if (urlStr.includes("api.telegram.org")) {
      const text = init?.body ? JSON.parse(init.body as string).text : "";
      console.log(`\n[MockTG] 接收到 Bot 发送的消息:\n----------------------------------------\n${text}\n----------------------------------------\n`);
      return { ok: true } as Response;
    }

    // 拦截 Gemini API 请求
    if (urlStr.includes("generativelanguage.googleapis.com")) {
      console.log("[MockGemini] 拦截 Gemini API 请求...");
      const mockText = "🤖 懂球助教 Pitchy: 哎呀，我看了一眼账本，你的余额怎么只剩 9900 了？昨晚押了曼联主胜是吧？滕哈格赛后可能还在埋怨裁判的越位判罚，而你只能看着缩水的钱包发呆。听我的，赶紧打 /fixtures 换个德甲或者西甲的盘口回回血，别再吊死在红魔这一棵树上了！";
      
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: mockText }
                ]
              }
            }
          ]
        })
      } as Response;
    }

    return { ok: false } as Response;
  }) as typeof fetch;
}

function restoreFetch() {
  global.fetch = originalFetch;
}

async function runTests() {
  console.log("=== 正在运行 PitchLab TG Bot AI 懂球搭子测试 ===");
  process.env.DATA_SOURCE_TYPE = "mock";
  process.env.ALLOW_MOCK = "true";


  const testChatId = 99999;
  const idStr = String(testChatId);
  const fakeEmail = `tg_${testChatId}@quantedge.local`;

  // 1. 清理已有的测试数据，确保测试是幂等的
  await prisma.paperTrade.deleteMany({ where: { user: { email: fakeEmail } } }).catch(() => {});
  await prisma.channelBinding.deleteMany({ where: { externalId: idStr } }).catch(() => {});
  await prisma.paperWallet.deleteMany({ where: { user: { email: fakeEmail } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: fakeEmail } }).catch(() => {});

  console.log("1. 数据库清理完成。");

  // 2. 创建一个拥有失败投注历史的用户
  const user = await prisma.user.create({
    data: {
      email: fakeEmail,
      channelBindings: {
        create: {
          channel: "telegram",
          externalId: idStr,
          verifiedAt: new Date(),
        }
      },
      paperWallet: {
        create: {
          balance: 9900, // 初始为 10000，扣除 100 下注本金，结算时又扣了 100 (已修复此 settlement Bug)
          currency: "research_units"
        }
      },
      paperTrades: {
        create: {
          fixtureId: "mock_pl_mun_ars",
          league: "PL",
          home: "Manchester United",
          away: "Arsenal",
          kickoffUtc: new Date(),
          selection: "H",
          odds: 2.50,
          stake: 100,
          status: "lost",
          pnl: -100,
          settledAt: new Date()
        }
      }
    }
  });

  const hasKey = !!process.env.GEMINI_API_KEY;
  if (!hasKey) {
    console.log("提示: 未检测到 GEMINI_API_KEY，进入本地单元测试拦截模式。");
    mockGeminiFetch();
    process.env.GEMINI_API_KEY = "mock_key";
  } else {
    console.log("提示: 检测到 GEMINI_API_KEY，即将发起真实网络请求联调 AI 懂球人设回复！");
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = input.toString();
      if (urlStr.includes("api.telegram.org")) {
        const text = init?.body ? JSON.parse(init.body as string).text : "";
        console.log(`\n[MockTG] 拦截并模拟 TG 收到消息:\n----------------------------------------\n${text}\n----------------------------------------\n`);
        return { ok: true } as Response;
      }
      return originalFetch(input, init);
    }) as typeof fetch;
  }

  try {
    const chatUpdate: TelegramUpdate = {
      update_id: 100,
      message: {
        chat: { id: testChatId },
        text: "我昨天投注曼联又输了，钱包缩水了，你有什么想说的？"
      }
    };

    console.log("用户发送：“我昨天投注曼联又输了，钱包缩水了，你有什么想说的？”");
    await handleTelegramUpdate(chatUpdate);
    console.log("🎉 AI 懂球搭子交互与记忆调侃路径测试成功！");
  } finally {
    restoreFetch();
    if (!hasKey) {
      delete process.env.GEMINI_API_KEY;
    }
    console.log("正在清理单元测试临时数据...");
    try {
      await prisma.paperTrade.deleteMany({ where: { user: { email: fakeEmail } } }).catch(() => {});
      await prisma.channelBinding.deleteMany({ where: { externalId: idStr } }).catch(() => {});
      await prisma.paperWallet.deleteMany({ where: { user: { email: fakeEmail } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: fakeEmail } }).catch(() => {});
      console.log("单元测试临时数据清理成功。");
    } catch (err) {
      console.warn("清理单元测试临时数据失败:", err);
    }
    await prisma.$disconnect();
  }

}

runTests().catch((err) => {
  console.error("❌ 单元测试运行出错：", err);
  process.exit(1);
});
