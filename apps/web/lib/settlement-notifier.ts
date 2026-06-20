import { sendTelegramMessage } from "./telegram-bot";

export type SettleResult = {
  id: string;
  userId: string;
  home: string;
  away: string;
  selection: string;
  odds: number;
  stake: number;
  won: boolean;
  pnl: number;
  status: string;
  tgChatId?: string | null;
};

export async function notifySettledTrades(settled: SettleResult[]) {
  for (const s of settled) {
    if (!s.tgChatId) continue;
    
    let outcomeText = "";
    let pnlText = "";
    if (s.status === "void") {
      outcomeText = `🔄 *比赛已取消/推迟/中断*`;
      pnlText = `0 RU (本金已全额退回钱包)`;
    } else {
      outcomeText = s.won ? `🏆 *模拟竞猜红单！*` : `📉 *模拟竞猜黑单*`;
      pnlText = s.won ? `+${s.pnl.toFixed(0)} RU` : `${s.pnl.toFixed(0)} RU`;
    }

    const message = [
      `🔔 *模拟下注结算通知*`,
      `--------------------------------`,
      `${outcomeText}`,
      `比赛：${s.home} vs ${s.away}`,
      `选项：${s.selection === "H" ? "主胜" : s.selection === "D" ? "平局" : "客胜"} @ ${s.odds.toFixed(2)}`,
      `本金：${s.stake} RU`,
      `盈亏：*${pnlText}*`,
      `--------------------------------`,
      `点击进入 [Quant Edge TMA](https://t.me/QuantEdgeBot) 继续竞猜`
    ].join("\n");

    sendTelegramMessage(s.tgChatId, message).catch(err => {
      console.error(`[Settlement Push] Failed to send Telegram message to ${s.tgChatId}:`, err);
    });
  }
}
