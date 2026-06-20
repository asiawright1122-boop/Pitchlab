/**
 * Post-pipeline notifications to bound Telegram chats (Pro users).
 *
 *   npm run notify -w pitchlab-worker
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type FeedbackPayload = {
  generated_at?: string;
  summary_verdict?: string;
  backtest_summary?: { avg_clv?: number | null; brier?: number };
  champion_challenger?: {
    auto_promote?: boolean;
    note?: string;
    challenger?: {
      league?: string;
      model_id?: string;
      value?: number;
    };
  };
};

type ValueFixture = {
  home: string;
  away: string;
  league?: string;
  value_bets?: { selection: string; edge: number; ev: number; odds: number }[];
};

type ValuePayload = {
  fixtures?: ValueFixture[];
  min_edge?: number;
};

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[\]()])/g, "\\$1");
}

function formatMessage(
  fb: FeedbackPayload | null,
  val: ValuePayload | null,
  pipelineAt: string | null
): string {
  const clv = fb?.backtest_summary?.avg_clv;
  const clvPct = clv != null ? `${(clv * 100).toFixed(2)}%` : "n/a";
  const brier = fb?.backtest_summary?.brier?.toFixed(4) ?? "n/a";

  // 1. 影子模型评估与自动晋升信息
  let shadowMsg = "";
  const cc = fb?.champion_challenger;
  if (cc) {
    const isPromoted = cc.auto_promote === true;
    const safeNote = escapeMarkdown(cc.note || "");
    if (isPromoted && cc.challenger?.model_id) {
      const safeModelId = escapeMarkdown(cc.challenger.model_id);
      shadowMsg = [
        "🚀 *影子模型自动晋升喜报*",
        `- 动态决定：影子模型 [${safeModelId}] 已经成功晋升为 *${cc.challenger.league || "E0"}* 联赛核心导出模型！`,
        `- Hold-out 验证集 Brier 偏离差异：\`${cc.challenger.value?.toFixed(4) ?? "n/a"}\``,
        `- 决策依据原因：_${safeNote}_`,
        "",
      ].join("\n");
    } else {
      shadowMsg = [
        "⚖️ *影子模型校准状态*",
        `- 动态决定：当前核心预测模型继续保持稳定运行。`,
        `- 最新判定依据：_${safeNote || "评估中"}_`,
        "",
      ].join("\n");
    }
  }

  // 2. 提取最高价值的 Top 3 赛事投注
  let valueMsg = "";
  if (val?.fixtures?.length) {
    const valBets: {
      home: string;
      away: string;
      selection: string;
      odds: number;
      edge: number;
    }[] = [];

    for (const f of val.fixtures) {
      for (const b of f.value_bets ?? []) {
        valBets.push({
          home: f.home,
          away: f.away,
          selection: b.selection,
          odds: b.odds,
          edge: b.edge,
        });
      }
    }

    const sorted = valBets.sort((a, b) => b.edge - a.edge).slice(0, 3);
    if (sorted.length > 0) {
      const items = sorted.map((b, i) => {
        const selText = b.selection === "home" ? "主胜" : b.selection === "away" ? "客胜" : "平局";
        const safeHome = escapeMarkdown(b.home);
        const safeAway = escapeMarkdown(b.away);
        return `${i + 1}. *${safeHome} v ${safeAway}* · \`[${selText} @ ${b.odds.toFixed(2)}]\` (Edge: *${(b.edge * 100).toFixed(1)}%*)`;
      });
      valueMsg = [
        "🔥 *今日高价值模拟下注推荐*",
        ...items,
        "",
      ].join("\n");
    }
  }

  const safeTime = pipelineAt ? escapeMarkdown(pipelineAt) : "";

  return [
    "🔔 *PitchLab 量化 Pipeline 报告已同步*",
    "------------------------------------",
    "📊 *[大盘表现]*",
    `- 终场收盘 CLV: *${clvPct}*`,
    `- Brier 预测差异分: *${brier}*`,
    safeTime ? `- 同步时间: \`${safeTime}\`` : "",
    "",
    shadowMsg,
    valueMsg,
    "_(量化科研模拟盘展示 · 不构成任何真实博彩建议)_",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`[notify] TELEGRAM_BOT_TOKEN unset — skip send to ${chatId}`);
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
    console.error("[notify] telegram error", await res.text());
    return false;
  }
  return true;
}

async function main() {
  const bindings = await prisma.channelBinding.findMany({
    where: { channel: "telegram" },
    include: {
      user: {
        select: {
          email: true,
          subscription: { include: { plan: true } },
        },
      },
    },
  });

  const proBindings = bindings.filter((b) => {
    const ent = b.user.subscription?.plan.entitlements;
    if (!ent || typeof ent !== "object") return false;
    return !!(ent as Record<string, boolean>).push;
  });

  const [fbRow, valRow, lastRun] = await Promise.all([
    prisma.publishedArtifact.findUnique({ where: { key: "feedback_snapshot" } }),
    prisma.publishedArtifact.findUnique({ where: { key: "value" } }),
    prisma.pipelineRun.findFirst({
      orderBy: { finishedAt: "desc" },
      where: { status: "ok" },
    }),
  ]);
  const fb = (fbRow?.payload ?? null) as FeedbackPayload | null;
  const val = (valRow?.payload ?? null) as ValuePayload | null;
  const text = formatMessage(fb, val, lastRun?.finishedAt?.toISOString() ?? null);

  console.log("\n=== TELEGRAM PUSH PREVIEW ===");
  console.log(text);
  console.log("===============================\n");

  if (!proBindings.length) {
    console.log("[notify] no Pro telegram bindings");
    return;
  }

  let sent = 0;
  for (const b of proBindings) {
    console.log(`[notify] ${b.user.email} → telegram:${b.externalId}`);
    if (await sendTelegram(b.externalId, text)) sent += 1;
  }
  console.log(`[notify] delivered ${sent}/${proBindings.length}`);
}

main()
  .catch((e) => {
    console.error("[notify] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
