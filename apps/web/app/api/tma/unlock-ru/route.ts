import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

const RU_UNLOCK_COST = 2000;

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-tma-init-data");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    let dbUser;

    if (initData && token) {
      const payload = validateInitData(initData, token);
      if (!payload) {
        return NextResponse.json({ success: false, error: "Invalid Telegram Auth Data" }, { status: 403 });
      }
      dbUser = await getOrCreateTmaUser(payload.user, payload.startParam);
    } else {
      const webUser = await getCurrentUser();
      if (!webUser) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      dbUser = webUser;
    }

    const { fixtureId } = await request.json();
    if (!fixtureId) {
      return NextResponse.json({ success: false, error: "Missing fixtureId" }, { status: 400 });
    }

    // Get user's wallet
    const wallet = await prisma.paperWallet.findUnique({
      where: { userId: dbUser.id }
    });

    if (!wallet || wallet.balance < RU_UNLOCK_COST) {
      return NextResponse.json({ 
        success: false, 
        error: `Insufficient balance. Need ${RU_UNLOCK_COST.toLocaleString()} RU.` 
      }, { status: 400 });
    }

    // Check if already unlocked
    const existingUnlock = await prisma.matchUnlock.findUnique({
      where: {
        userId_fixtureId: {
          userId: dbUser.id,
          fixtureId: fixtureId,
        }
      }
    });

    if (existingUnlock) {
      return NextResponse.json({ success: true, message: "Already unlocked" });
    }

    // Use transaction to deduct RU and create unlock record atomically
    await prisma.$transaction(async (tx) => {
      const walletUpdate = await tx.paperWallet.updateMany({
        where: { 
          userId: dbUser.id,
          balance: { gte: RU_UNLOCK_COST }
        },
        data: { balance: { decrement: RU_UNLOCK_COST } }
      });

      if (walletUpdate.count === 0) {
        throw new Error("Insufficient balance or concurrent unlock conflict");
      }
      
      await tx.matchUnlock.create({
        data: {
          userId: dbUser.id,
          fixtureId: fixtureId,
          method: "ru",
          amount: RU_UNLOCK_COST,
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error unlocking with RU:", error);
    if (error.message === "Insufficient balance or concurrent unlock conflict") {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
