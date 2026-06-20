import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 15 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.TELEGRAM_BIND_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET (or TELEGRAM_BIND_SECRET) required for Telegram bind");
  }
  return s;
}

export function createTelegramBindToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}:${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

export function verifyTelegramBindToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = raw.lastIndexOf(":");
    if (lastColon < 0) return null;
    const payload = raw.slice(0, lastColon);
    const sig = raw.slice(lastColon + 1);
    const expected = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a as any, b as any)) return null;
    const [userId, expStr] = payload.split(":");
    const exp = Number(expStr);
    if (!userId || Number.isNaN(exp) || Date.now() > exp) return null;
    return userId;
  } catch {
    return null;
  }
}

export const TELEGRAM_BIND_TTL_SEC = TTL_MS / 1000;
