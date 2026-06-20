import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { canAccess } from "@/lib/entitlements";
import { buildTelegramConnectUrl } from "@/lib/telegram-bot";
import { TELEGRAM_BIND_TTL_SEC } from "@/lib/telegram-bind-token";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const isMockOrDev = process.env.ALLOW_MOCK === "true" || process.env.NODE_ENV === "development";
  if (!canAccess(user.entitlements, "push") && !isMockOrDev) {
    return NextResponse.json({ error: "pro required" }, { status: 403 });
  }

  const link = await buildTelegramConnectUrl(user.id);
  if (!link) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured on server" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    url: link.url,
    expires_in: link.expires_in ?? TELEGRAM_BIND_TTL_SEC,
  });
}
