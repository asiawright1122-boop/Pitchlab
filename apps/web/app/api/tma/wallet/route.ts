import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";
import { settleOpenPaperTrades } from "@/lib/paper";
import { notifySettledTrades } from "@/lib/settlement-notifier";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const initData = request.headers.get("x-tma-init-data");
    
    // DEV environment mock
    let userTgId: number;
    if (process.env.NODE_ENV === "development" && (!initData || initData === "")) {
      userTgId = 123456789;
    } else if (!initData) {
      return NextResponse.json({ success: false, message: "No initData provided" }, { status: 401 });
    } else {
      const token = process.env.TELEGRAM_BOT_TOKEN || "";
      const isValid = validateInitData(initData, token);
      if (!isValid) {
        return NextResponse.json({ success: false, message: "Invalid initData" }, { status: 401 });
      }
      const searchParams = new URLSearchParams(initData);
      const userParam = searchParams.get("user");
      if (!userParam) {
        return NextResponse.json({ success: false, message: "No user data" }, { status: 401 });
      }
      const userData = JSON.parse(userParam);
      userTgId = userData.id;
    }

    const tmaUserPayload = { id: userTgId };
    let tmaUser = await getOrCreateTmaUser(tmaUserPayload);

    if (tmaUser) {
      // Automatically settle any open trades for this user
      const { settled } = await settleOpenPaperTrades(prisma, tmaUser.id);
      if (settled.length > 0) {
        await notifySettledTrades(settled);
      }
      
      // Refetch user to get the newly updated paperWallet balance
      const freshUser = await prisma.user.findUnique({
        where: { id: tmaUser.id },
        include: { paperWallet: true }
      });
      if (freshUser) {
        tmaUser = freshUser as any;
      }
    }

    const allTrades = await prisma.paperTrade.findMany({
      where: { userId: tmaUser.id },
      orderBy: { settledAt: 'asc' }
    });

    const settledTrades = allTrades.filter(t => t.status !== 'open');
    const totalTrades = allTrades.length;
    const openTrades = allTrades.filter(t => t.status === 'open').length;

    // Calculate performance metrics
    const netPnl = settledTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalStake = settledTrades.reduce((sum, t) => sum + t.stake, 0);
    const roi = totalStake > 0 ? (netPnl / totalStake) * 100 : 0;
    const settledCount = settledTrades.length;
    const wonCount = settledTrades.filter(t => t.status === 'won').length;
    const winRate = settledCount > 0 ? (wonCount / settledCount) * 100 : 0;

    // Generate cumulative PnL history series
    let runningPnl = 0;
    const pnlHistory = [{ name: "Start", pnl: 0 }];
    settledTrades.forEach((t, index) => {
      runningPnl += (t.pnl || 0);
      const dateStr = t.settledAt 
        ? new Date(t.settledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `Bet ${index + 1}`;
      pnlHistory.push({
        name: dateStr,
        pnl: Math.round(runningPnl * 100) / 100
      });
    });

    const recentTrades = await prisma.paperTrade.findMany({
      where: { userId: tmaUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const inviteCount = await prisma.user.count({
      where: { invitedById: tmaUser.id }
    });

    return NextResponse.json({
      success: true,
      userId: tmaUser.id,
      inviteCount: inviteCount,
      wallet: {
        balance: tmaUser.paperWallet?.balance || 10000,
        totalTrades: totalTrades,
        openTrades: openTrades
      },
      performance: {
        netPnl: Math.round(netPnl * 100) / 100,
        roi: Math.round(roi * 10) / 10,
        winRate: Math.round(winRate * 10) / 10,
        pnlHistory
      },
      recentTrades: recentTrades
    });

  } catch (error) {
    console.error("[Wallet API] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
