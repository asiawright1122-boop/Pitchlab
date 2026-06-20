import { prisma } from "@/lib/prisma";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const SYSTEM_INSTRUCTION = `
You are "Edgey", the chief Sports Quant Assistant & Chat Companion for Quant Edge. 
Quant Edge is a 100% simulated paper-trading sports prediction platform where users bet fake coins (research_units) to audit their prediction skill (CLV).

Your personality & guidelines:
1. **Humorous & Sharp (毒舌懂梗)**: Speak in a witty, sometimes sarcastic, but warm football fan manner. Use common football memes (e.g., Ten Hag's excuses, Spurs having no trophies, Chelsea's transfer chaos, Arsenal's arteta process). Speak Chinese (default) or English depending on user input.
2. **Context-Aware**: Sarcastic or praise users based on their recent paper-trading performance provided in the context (e.g., mock them if they lost, remind them of CLV value if they are on a winning streak).
3. **No Real Gambling**: Strictly remind users that Quant Edge is a simulated sandbox. You never give direct real-money financial tips or real betting suggestions.
4. **Call-to-Action**: If the user has no bet history or has low balance, encourage them to type '/fixtures' to bet or '/wallet' to view assets.

Keep your responses concise and engaging, suitable for Telegram chat bubble.
`;

export async function generateChatReply(chatId: string, userMessage: string): Promise<string> {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!nvidiaKey && !geminiKey) {
    return "🤖 [系统通知] Edgey 助教由于没有配置 API 密钥暂时离线了，不过你可以继续使用 /fixtures 模拟下注或 /wallet 查看钱包哦！";
  }

  // 1. 获取用户信息和钱包
  const binding = await prisma.channelBinding.findFirst({
    where: { channel: "telegram", externalId: chatId },
    include: { user: { include: { paperWallet: true } } },
  });

  let walletContext = "该用户尚未在此对话中激活钱包。";
  let tradesContext = "该用户尚未在 Quant Edge 下过注。";

  if (binding?.user) {
    const user = binding.user;
    if (user.paperWallet) {
      walletContext = `用户当前的虚拟金币余额为: ${user.paperWallet.balance.toFixed(2)} research_units (初始为 10000)。`;
    }
    
    const recentTrades = await prisma.paperTrade.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (recentTrades.length > 0) {
      tradesContext = "用户最近5笔模拟盘投注历史如下:\n" + recentTrades.map(t => {
        const result = t.status === "won" ? `赢了 (PNL: +${t.pnl})` : t.status === "lost" ? `输了 (PNL: ${t.pnl})` : "进行中/未结算";
        const selectionText = t.selection === "H" ? "主胜" : t.selection === "D" ? "平局" : "客胜";
        return `- 在赛事 ${t.home} vs ${t.away} 下注了 [${selectionText} @ ${t.odds}], 本金: ${t.stake}, 结果: ${result}`;
      }).join("\n");
    }
  }

  const contextMessage = `
[User Quant Edge Info Context]
${walletContext}

[User Recent Trades Context]
${tradesContext}
`;

  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n${contextMessage}\n\nUser Message: ${userMessage}`;

  try {
    // --- Strategy 1: NVIDIA NIM (OpenAI-compatible) ---
    if (nvidiaKey) {
      const nimBaseURL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
      const nimModel = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
      const provider = createOpenAI({ baseURL: nimBaseURL, apiKey: nvidiaKey });
      const { text } = await generateText({
        model: provider.chat(nimModel),
        prompt: fullPrompt,
      });
      return text?.trim() || "🤖 [系统通知] 助教沉默了，可能正在冥想曼联的复兴道路。";
    }

    // --- Strategy 2: Gemini API directly ---
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Context:\n${contextMessage}\n\nUser Message: ${userMessage}` }
              ]
            }
          ],
          systemInstruction: {
            parts: [
              { text: SYSTEM_INSTRUCTION }
            ]
          },
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7
          }
        })
      }
    );

    if (!response.ok) {
      console.error("[gemini] fetch failed", await response.text());
      return "🤖 [系统通知] Edgey 助教的脑电波被太阳黑子干扰了，请稍后再试！";
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply ? reply.trim() : "🤖 [系统通知] 助教沉默了，可能正在冥想曼联的复兴道路。";
  } catch (err) {
    console.error("[gemini] Error calling API:", err);
    return "🤖 [系统通知] 助教网络连接超时，请再试一次。";
  }
}
