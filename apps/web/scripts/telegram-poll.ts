/**
 * Long-polling Telegram bot (local dev without public webhook URL).
 *
 *   TELEGRAM_BOT_TOKEN=... npm run telegram:poll -w pitchlab-web
 */
import { handleTelegramUpdate, type TelegramUpdate } from "../lib/telegram-bot";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("[telegram:poll] TELEGRAM_BOT_TOKEN required");
  process.exit(1);
}

let offset = 0;

async function poll() {
  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  url.searchParams.set("timeout", "30");
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[telegram:poll]", await res.text());
    return;
  }

  const data = (await res.json()) as {
    ok?: boolean;
    result?: TelegramUpdate[];
  };

  for (const update of data.result ?? []) {
    if (update.update_id != null) offset = update.update_id + 1;
    await handleTelegramUpdate(update);
  }
}

async function loop() {
  console.log("[telegram:poll] listening (Ctrl+C to stop)");
  for (;;) {
    await poll();
  }
}

loop().catch((e) => {
  console.error("[telegram:poll]", e);
  process.exit(1);
});
