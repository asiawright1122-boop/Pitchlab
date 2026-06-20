import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { resolveDataDir } from "./artifacts.js";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      let val = trimmed.slice(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (e) {
    console.warn(`[notify-promotion] Failed to parse env file at ${filePath}:`, e);
  }
}

loadEnvFile(path.resolve(import.meta.dirname, "../../../.env"));
loadEnvFile(path.resolve(import.meta.dirname, "../../web/.env.local"));

const prisma = new PrismaClient();

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[\]()])/g, "\\$1");
}

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
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
  return res.ok;
}

export async function sendPromotionNotification(policy: any): Promise<void> {
  const modelId = policy.promoted_model_id;
  const gates = policy.gates || {};
  const clvMsg = gates.clv?.detail || "N/A";
  const brierMsg = gates.brier?.detail || "N/A";
  const eceMsg = gates.ece?.detail || "N/A";
  const reason = policy.reason || "N/A";
  const rule = policy.promote_if || "N/A";

  const timeStr = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  const tgText = [
    "🚀 🏆 *【PitchLab 模型自动进化喜报】*",
    "------------------------------------",
    "量化引擎刚才触发了 *Champion 模型更替* 决策：",
    "",
    `- 🌟 *新晋 Champion 模型*：\`${escapeMarkdown(modelId)}\``,
    `- 📊 *CLV 闸门校验*：✓ 通过 (_${escapeMarkdown(clvMsg)}_)`,
    `- 📉 *Brier 评分闸门*：✓ 通过 (_${escapeMarkdown(brierMsg)}_)`,
    `- 🎛️ *ECE 校准闸门*：✓ 通过 (_${escapeMarkdown(eceMsg)}_)`,
    `- 💡 *晋升决策规则*：\`${escapeMarkdown(rule)}\``,
    `- 🎯 *触发缘由*：_${escapeMarkdown(reason)}_`,
    `- 📅 *更替时间*：\`${escapeMarkdown(timeStr)}\``,
    "",
    "*(该变更已通过同步写入 active_model_version 数据库全局设置，看板预测即刻生效)*",
    "------------------------------------",
    "_(量化科研模拟盘展示 · 不构成任何真实博彩建议)_"
  ].join("\n");

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; background-color: #f8fafc; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; padding: 24px; text-align: center; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .content { padding: 24px; }
    .metric-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .metric-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .metric-table td.label { font-weight: 600; color: #475569; width: 130px; }
    .metric-table td.value { font-family: monospace; color: #0f172a; }
    .footer { text-align: center; font-size: 12px; color: #64748b; padding: 20px; border-top: 1px solid #f1f5f9; background-color: #fafafa; }
    .badge { display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>🏆 PitchLab 模型自动进化审计邮件</h2>
    </div>
    <div class="content">
      <p>管理员您好，系统的 Champion 影子模型在今日执行中已通过评估闸门并触发自动晋升：</p>
      
      <table class="metric-table">
        <tr>
          <td class="label">新晋 Champion</td>
          <td class="value" style="font-weight: bold; color: #4f46e5;">${modelId}</td>
        </tr>
        <tr>
          <td class="label">CLV 闸门</td>
          <td class="value"><span class="badge">Passed</span> ${clvMsg}</td>
        </tr>
        <tr>
          <td class="label">Brier 闸门</td>
          <td class="value"><span class="badge">Passed</span> ${brierMsg}</td>
        </tr>
        <tr>
          <td class="label">ECE 闸门</td>
          <td class="value"><span class="badge">Passed</span> ${eceMsg}</td>
        </tr>
        <tr>
          <td class="label">决策规则</td>
          <td class="value">${rule}</td>
        </tr>
        <tr>
          <td class="label">触发原因</td>
          <td class="value"><em>${reason}</em></td>
        </tr>
        <tr>
          <td class="label">决策时间</td>
          <td class="value">${timeStr}</td>
        </tr>
      </table>
      
      <p style="font-size: 13px; color: #64748b;">该晋升配置已被 Worker 写入数据库的主配置表 (SystemSetting)，Next.js 客户端及 TMA 的所有预测渲染在接下来的同步后将完全基于该模型版本产出。</p>
    </div>
    <div class="footer">
      PitchLab Quant Engine Audit Log Service
    </div>
  </div>
</body>
</html>
`.trim();

  console.log("\n📢 === PROMOTION TELEGRAM PUSH PREVIEW ===");
  console.log(tgText);
  console.log("=========================================\n");

  console.log("\n✉️ === PROMOTION EMAIL AUDIT PREVIEW ===");
  console.log(`To: Admin <admin@pitchlab.ai>`);
  console.log(`Subject: [Audit] Model Promotion Triggered - ${modelId}`);
  console.log(`Content HTML:\n${emailHtml}`);
  console.log("=======================================\n");

  try {
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

    const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
    const targets = new Set<string>(proBindings.map((b) => b.externalId));
    if (adminChatId) {
      targets.add(adminChatId);
    }

    if (targets.size > 0) {
      let sent = 0;
      for (const chatId of targets) {
        if (await sendTelegram(chatId, tgText)) {
          sent++;
        }
      }
      console.log(`[notify-promotion] Successfully broadcasted to ${sent}/${targets.size} Telegram chats.`);
    } else {
      console.log("[notify-promotion] No active Pro Telegram bindings or Admin Chat ID configured. Skipping TG send.");
    }
  } catch (err) {
    console.error("[notify-promotion] Error broadcasting Telegram alerts:", err);
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    console.log("[notify-promotion] RESEND_API_KEY configured. Sending real audit email...");
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: "PitchLab Audit <audit@pitchlab.ai>",
          to: ["admin@pitchlab.ai"],
          subject: `[Audit] Model Promotion Triggered - ${modelId}`,
          html: emailHtml
        })
      });
      if (response.ok) {
        console.log("[notify-promotion] Audit email successfully delivered to admin via Resend.");
      } else {
        console.error("[notify-promotion] Resend delivery failed:", await response.text());
      }
    } catch (e) {
      console.error("[notify-promotion] Failed to deliver email via Resend:", e);
    }
  } else {
    console.log("[notify-promotion] RESEND_API_KEY not configured. Skipping live email dispatch (preview outputted above).");
  }
}
