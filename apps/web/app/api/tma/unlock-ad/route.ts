import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-tma-init-data");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!initData || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tmaUser = validateInitData(initData, token);
    if (!tmaUser) {
      return NextResponse.json({ error: "Invalid Telegram Auth Data" }, { status: 403 });
    }

    const { fixtureId } = await request.json();
    if (!fixtureId) {
      return NextResponse.json({ error: "Missing fixtureId" }, { status: 400 });
    }

    const dbUser = await getOrCreateTmaUser(tmaUser.user, tmaUser.startParam);

    // Save ad unlock
    await prisma.matchUnlock.upsert({
      where: { userId_fixtureId: { userId: dbUser.id, fixtureId } },
      create: {
        userId: dbUser.id,
        fixtureId,
        method: "adsgram",
        amount: 0,
      },
      update: {}
    });

    return NextResponse.json({
      success: true,
      message: "Match unlocked via Ad"
    });
  } catch (error) {
    console.error("Error unlocking match via ad:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
