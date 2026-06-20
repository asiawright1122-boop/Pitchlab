import { NextResponse } from "next/server";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { initData } = await req.json();

    if (!initData) {
      return NextResponse.json({ error: "No initData provided" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken && process.env.NODE_ENV !== "development") {
      console.error("TELEGRAM_BOT_TOKEN is not set in environment");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const authResult = validateInitData(initData, botToken || "");
    
    if (!authResult) {
      return NextResponse.json({ error: "Invalid Telegram signature" }, { status: 401 });
    }

    const { user: tmaUser, startParam } = authResult;

    // Database logic: create or fetch the user, give bonuses
    const user = await getOrCreateTmaUser(tmaUser, startParam);

    // Save session
    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    await session.save();

    return NextResponse.json({ 
      ok: true, 
      user: {
        id: user.id,
        telegramId: tmaUser.id,
        firstName: tmaUser.first_name,
        username: tmaUser.username,
        balance: user.paperWallet?.balance || 0
      }
    });

  } catch (error: any) {
    console.error("[Auth API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
