import { canAccess, parseEntitlements } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { createTelegramBindToken, verifyTelegramBindToken } from "@/lib/telegram-bind-token";
import { getDataAdapter } from "@/lib/data-adapter/factory";
import { generateChatReply } from "@/lib/gemini";

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    chat?: { id: number };
    text?: string;
    successful_payment?: {
      currency: string;
      total_amount: number;
      invoice_payload: string;
      telegram_payment_charge_id: string;
      provider_payment_charge_id: string;
    };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string };
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
    };
    data?: string;
  };
  pre_checkout_query?: {
    id: string;
    from: { id: number; first_name?: string };
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
};

export function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

export async function getBotUsername(): Promise<string | null> {
  const cached = process.env.TELEGRAM_BOT_USERNAME;
  if (cached) return cached.replace(/^@/, "");
  const token = getBotToken();
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  if (!res.ok) return null;
  const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
  return data.result?.username ?? null;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = getBotToken();
  if (!token) {
    console.log(`[telegram] TELEGRAM_BOT_TOKEN unset — skip send to ${chatId}`);
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    console.error("[telegram] sendMessage failed", await res.text());
    return false;
  }
  return true;
}

export async function sendTelegramMessageWithKeyboard(
  chatId: string,
  text: string,
  replyMarkup: any
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  });
  if (!res.ok) {
    console.error("[telegram] sendMessageWithKeyboard failed", await res.text());
    return false;
  }
  return true;
}

export async function sendTelegramPhotoWithKeyboard(
  chatId: string,
  photoUrl: string,
  caption: string,
  replyMarkup?: any
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
  if (!res.ok) {
    console.error("[telegram] sendPhoto failed", await res.text());
    return false;
  }
  return true;
}

export async function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      error_message: errorMessage,
    }),
  });
  if (!res.ok) {
    console.error("[telegram] answerPreCheckoutQuery failed", await res.text());
    return false;
  }
  return true;
}

export async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
  if (!res.ok) {
    console.error("[telegram] answerCallbackQuery failed", await res.text());
    return false;
  }
  return true;
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: any
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: replyMarkup,
    }),
  });
  if (!res.ok) {
    console.error("[telegram] editMessageText failed", await res.text());
    return false;
  }
  return true;
}

async function bindChatToUser(userId: string, chatId: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  const ent = parseEntitlements(sub?.plan.entitlements);
  if (!canAccess(ent, "push")) {
    return "Pro plan required for pipeline push. Upgrade at /pricing then try again.";
  }

  await prisma.channelBinding.upsert({
    where: { userId_channel: { userId, channel: "telegram" } },
    create: {
      userId,
      channel: "telegram",
      externalId: chatId,
      verifiedAt: new Date(),
    },
    update: { externalId: chatId, verifiedAt: new Date() },
  });

  const wallet = await prisma.paperWallet.findUnique({
    where: { userId },
  });
  const balanceStr = wallet ? `${Math.round(wallet.balance).toLocaleString()} u` : "10,000 u";

  return [
    "🤝 *Quant Edge 绑定成功！*",
    "",
    "您已将当前 Telegram 账号与 Quant Edge Web 账户成功绑定关联。",
    "",
    `当前模拟沙盒本金：💰 *${balanceStr}*`,
    "",
    "我们将在每次量化数据 Pipeline 执行完成后，自动为您分发最新的*大盘总结、自动晋升的影子模型、以及最新的焦点价值推荐*报告。",
    "",
    "_(本系统仅供量化科研展示，不构成任何真实博彩建议。)_",
  ].join("\n");
}

async function getOrCreateTelegramUser(chatId: string) {
  const binding = await prisma.channelBinding.findFirst({
    where: { channel: "telegram", externalId: chatId },
    include: { user: { include: { paperWallet: true } } },
  });

  if (binding?.user) {
    return binding.user;
  }

  const email = `tg_${chatId}@quantedge.local`;
  const user = await prisma.user.create({
    data: {
      email,
      channelBindings: {
        create: {
          channel: "telegram",
          externalId: chatId,
          verifiedAt: new Date(),
        }
      },
      paperWallet: {
        create: {
          balance: 10000,
          currency: "research_units"
        }
      }
    },
    include: { paperWallet: true }
  });

  return user;
}

async function statusMessage(): Promise<string> {
  const [fbRow, run] = await Promise.all([
    prisma.publishedArtifact.findUnique({ where: { key: "feedback_snapshot" } }),
    prisma.pipelineRun.findFirst({
      orderBy: { startedAt: "desc" },
      where: { status: "ok" },
    }),
  ]);
  const fb = fbRow?.payload as {
    summary_verdict?: string;
    backtest_summary?: { avg_clv?: number | null; brier?: number };
  } | null;
  const clv = fb?.backtest_summary?.avg_clv;
  const lines = [
    "Quant Edge status",
    "",
    fb?.summary_verdict?.slice(0, 300) ?? "No feedback snapshot yet.",
    "",
    `Backtest CLV: ${clv != null ? `${(clv * 100).toFixed(2)}%` : "n/a"}`,
    `Last pipeline: ${run?.finishedAt?.toISOString() ?? "unknown"}`,
  ];
  return lines.join("\n");
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  // 0. Handle Payment Webhooks
  if (update.pre_checkout_query) {
    const pq = update.pre_checkout_query;
    await answerPreCheckoutQuery(pq.id, true);
    return;
  }

  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const chatId = update.message.chat?.id;
    if (chatId && payment.invoice_payload.startsWith("unlock_")) {
      const fixtureId = payment.invoice_payload.replace("unlock_", "");
      try {
        const user = await getOrCreateTelegramUser(String(chatId));
        await prisma.matchUnlock.upsert({
          where: { userId_fixtureId: { userId: user.id, fixtureId } },
          create: {
            userId: user.id,
            fixtureId,
            method: "stars",
            amount: payment.total_amount,
          },
          update: { amount: payment.total_amount }
        });
        
        await sendTelegramMessage(String(chatId), `✅ Payment successful! You have unlocked the premium prediction for match ${fixtureId}. You can now view it in the Mini App.`);
      } catch (err) {
        console.error("[telegram] Failed to process successful_payment:", err);
      }
    }
    return;
  }

  // 1. 处理回调查询 (Inline Keyboards 点击下注)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const queryId = cb.id;
    const data = cb.data;

    if (chatId == null || messageId == null || !data) return;

    if (data.startsWith("bet:")) {
      const parts = data.split(":");
      const [, fixtureId, selection, oddsStr] = parts;
      const odds = parseFloat(oddsStr);

      if (!fixtureId || !selection || isNaN(odds)) {
        await answerTelegramCallbackQuery(queryId, "投注参数错误");
        return;
      }

      try {
        const user = await getOrCreateTelegramUser(String(chatId));
        const wallet = user.paperWallet;
        const stake = 100; // 默认下注 100 金币

        if (!wallet || wallet.balance < stake) {
          await answerTelegramCallbackQuery(queryId, `投注失败！余额不足（仅剩 ${wallet?.balance ?? 0}）`);
          return;
        }

        const existing = await prisma.paperTrade.findFirst({
          where: { userId: user.id, fixtureId, status: "open" },
        });

        if (existing) {
          await answerTelegramCallbackQuery(queryId, "您已经对该场比赛投过注了！");
          return;
        }

        const adapter = getDataAdapter();
        const upcoming = await adapter.getUpcomingFixtures(["WC", "PL", "PD", "BL1", "SA", "FL1"], 48);
        const matchedFixture = upcoming.find(f => f.id === fixtureId);

        if (!matchedFixture) {
          await answerTelegramCallbackQuery(queryId, "找不到该比赛，可能盘口已关闭");
          return;
        }

        // 确保数据库存在此 Fixture，满足外键约束
        await prisma.fixture.upsert({
          where: { id: fixtureId },
          create: {
            id: fixtureId,
            league: matchedFixture.league,
            home: matchedFixture.home,
            away: matchedFixture.away,
            kickoffUtc: new Date(matchedFixture.kickoffUtc),
            status: matchedFixture.status,
          },
          update: {
            status: matchedFixture.status,
          }
        });

        // 扣除本金，记录模拟投注单
        await prisma.$transaction(async (tx) => {
          await tx.paperWallet.update({
            where: { userId: user.id },
            data: { balance: { decrement: stake } },
          });
          await tx.paperTrade.create({
            data: {
              userId: user.id,
              fixtureId,
              league: matchedFixture.league,
              home: matchedFixture.home,
              away: matchedFixture.away,
              kickoffUtc: new Date(matchedFixture.kickoffUtc),
              selection,
              odds,
              stake,
              status: "open",
            }
          });
        });

        const selectionText = selection === "H" ? "主胜" : selection === "D" ? "平局" : "客胜";

        await answerTelegramCallbackQuery(queryId, "投注成功！");
        await editTelegramMessage(
          String(chatId),
          messageId,
          `✅ 模拟下注成功！\n\n比赛：${matchedFixture.home} vs ${matchedFixture.away}\n您的选择：[${selectionText} @ ${odds}]\n下注本金：${stake} 金币\n当前剩余余额：${(wallet.balance - stake).toFixed(2)} 金币。`
        );
      } catch (err) {
        console.error("[telegram/bet]", err);
        await answerTelegramCallbackQuery(queryId, "系统忙，请重试");
      }
    }
    return;
  }

  // 2. 处理普通文本指令
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  if (chatId == null || !text) return;

  const id = String(chatId);

  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    const payload = parts[1] ?? "";
    if (payload.startsWith("bind_")) {
      const token = payload.slice(5);
      const userId = verifyTelegramBindToken(token);
      if (!userId) {
        await sendTelegramMessage(
          id,
          "Bind link expired or invalid. Open Quant Edge → System tab → Connect Telegram again."
        );
        return;
      }
      const msg = await bindChatToUser(userId, id);
      await sendTelegramMessage(id, msg);
      return;
    }

    // 自动为新用户初始化钱包和 10k 金币
    const user = await getOrCreateTelegramUser(id);

    const appUrl = (process.env.PUBLIC_WEBAPP_URL || "https://pitchlab.vercel.app").replace(/\/$/, "");

    await sendTelegramPhotoWithKeyboard(
      id,
      "https://images.unsplash.com/photo-1518605368461-1ee7c532066d?auto=format&fit=crop&q=80&w=1200&h=600",
      [
        "👋 <b>欢迎来到 Quant Edge AI 量化中心</b>",
        "",
        `🎁 <i>已为您开通专属沙盒钱包，赠送 <b>${user.paperWallet?.balance.toLocaleString()}</b> RU 金币！</i>`,
        "",
        "在这里，您可以随时通过模型计算的胜率进行无风险的模拟量化测试，量化您的真实眼光。",
        "",
        "👇 <b>快速操作指引：</b>",
        "⚽ /fixtures - 查看并参与焦点赛事预测",
        "💰 /wallet - 查询钱包余额与战绩",
        "📊 /status - 查看大盘数据与 CLV 反馈"
      ].join("\n"),
      {
        inline_keyboard: [
          [{ text: "⚡ 打开 PitchLab 小程序", web_app: { url: `${appUrl}/` } }]
        ]
      }
    );
    return;
  }

  if (text === "/help") {
    await sendTelegramMessage(
      id,
      [
        "可用命令如下：",
        "/start - 启动并领取 10,000 初始本金",
        "/fixtures - 列出近期可投焦点赛事",
        "/wallet - 查询虚拟余额与投注笔数",
        "/status - 查阅大盘 CLV 水平",
        "/help - 显示本菜单",
      ].join("\n")
    );
    return;
  }

  if (text === "/status") {
    await sendTelegramMessage(id, await statusMessage());
    return;
  }

  if (text === "/wallet") {
    try {
      const user = await getOrCreateTelegramUser(id);
      const wallet = user.paperWallet;
      const count = await prisma.paperTrade.count({ where: { userId: user.id } });
      const open = await prisma.paperTrade.count({ where: { userId: user.id, status: "open" } });

      await sendTelegramMessage(
        id,
        [
          "💰 您的 Quant Edge 虚拟钱包",
          "",
          `虚拟余额：${wallet?.balance.toFixed(2) ?? 0} research_units`,
          `累计投注：${count} 次（${open} 单进行中）`,
          "",
          "提示：点击 /fixtures 预测今日焦点大战！",
        ].join("\n")
      );
    } catch (err) {
      console.error("[telegram/wallet]", err);
      await sendTelegramMessage(id, "查询钱包失败");
    }
    return;
  }

  if (text === "/fixtures") {
    try {
      const adapter = getDataAdapter();
      const upcoming = await adapter.getUpcomingFixtures(["WC", "PL", "PD", "BL1", "SA", "FL1"], 48);

      if (upcoming.length === 0) {
        await sendTelegramMessage(id, "⚽ 暂时没有近 48 小时内的推荐比赛可供投注。");
        return;
      }

      // 对赛程进行排序：世界杯（WC）的赛事排在最前方，其余赛事按开赛时间升序排序
      const sortedUpcoming = [...upcoming].sort((a, b) => {
        if (a.league === "WC" && b.league !== "WC") return -1;
        if (a.league !== "WC" && b.league === "WC") return 1;
        return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
      });

      const appUrl = (process.env.PUBLIC_WEBAPP_URL || "https://pitchlab.vercel.app").replace(/\/$/, "");
      
      await sendTelegramPhotoWithKeyboard(
        id,
        "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=1200&h=400",
        "⚽ <b>今日焦点赛事</b>\n\n数据由 Quant Edge 量化引擎驱动。下方为精选比赛盘口，点击即可直接使用 <b>100 RU</b> 虚拟金币进行预测验证。\n\n<i>🏆 世界杯 (WC) 赛事已置顶。</i>",
        {
          inline_keyboard: [
            [{ text: "⚡ 进入 PitchLab 完整版", web_app: { url: `${appUrl}/` } }]
          ]
        }
      );

      for (const f of sortedUpcoming) {
        if (!f.odds) continue;
        const kickoff = new Date(f.kickoffUtc).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
        
        const isWC = f.league === "WC";
        const textMsg = `${isWC ? '🏆' : '🏟'} <b>${f.league} | ${f.home} vs ${f.away}</b>\n⏱ <i>${kickoff}</i>`;
        
        const replyMarkup = {
          inline_keyboard: [
            [
              { text: `${f.home} 胜 (${f.odds.home.toFixed(2)})`, callback_data: `bet:${f.id}:H:${f.odds.home}` },
              { text: `平局 (${f.odds.draw.toFixed(2)})`, callback_data: `bet:${f.id}:D:${f.odds.draw}` },
              { text: `${f.away} 胜 (${f.odds.away.toFixed(2)})`, callback_data: `bet:${f.id}:A:${f.odds.away}` }
            ]
          ]
        };
        
        await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: id,
            text: textMsg,
            parse_mode: "HTML",
            reply_markup: replyMarkup
          })
        });
      }
    } catch (err) {
      console.error("[telegram/fixtures]", err);
      await sendTelegramMessage(id, "获取焦点赛程失败");
    }
    return;
  }

  // 3. Fallback: 将普通文本交由 Gemini 懂球搭子处理
  try {
    const aiReply = await generateChatReply(id, text);
    await sendTelegramMessage(id, aiReply);
  } catch (err) {
    console.error("[telegram/gemini-fallback]", err);
    await sendTelegramMessage(id, "🤖 [系统通知] 助教脑电波暂时受到干扰，请稍后再试。");
  }
}

export async function buildTelegramConnectUrl(userId: string): Promise<{
  url: string;
  expires_in: number;
} | null> {
  const username = await getBotUsername();
  if (!username) return null;
  const token = createTelegramBindToken(userId);
  return {
    url: `https://t.me/${username}?start=bind_${token}`,
    expires_in: 15 * 60,
  };
}

