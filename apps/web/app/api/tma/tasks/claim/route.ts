import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-tma-init-data");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    // DEV environment mock
    let userTgId: number;
    if (process.env.NODE_ENV === "development" && (!initData || initData === "")) {
      userTgId = 123456789;
    } else if (!initData || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } else {
      const isValid = validateInitData(initData, token);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid Telegram Auth Data" }, { status: 403 });
      }
      const searchParams = new URLSearchParams(initData);
      const userParam = searchParams.get("user");
      if (!userParam) {
        return NextResponse.json({ error: "No user data" }, { status: 401 });
      }
      const userData = JSON.parse(userParam);
      userTgId = userData.id;
    }

    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ success: false, error: "Missing taskId" }, { status: 400 });
    }

    const tmaUserPayload = { id: userTgId };
    const tmaUser = await getOrCreateTmaUser(tmaUserPayload);

    if (!tmaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const todayDateString = startOfToday.toISOString().split('T')[0];

    let dbTaskId = taskId;
    let rewardAmount = 0;

    // 1. Resolve reward amounts and validate conditions per taskId
    if (taskId === "daily_bet") {
      dbTaskId = `daily_bet_${todayDateString}`;
      rewardAmount = 200;

      // Validate: Has user actually placed a bet today?
      const todayBetsCount = await prisma.paperTrade.count({
        where: {
          userId: tmaUser.id,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      });
      if (todayBetsCount < 1) {
        return NextResponse.json({ success: false, error: "您今天尚未完成任何模拟投注" }, { status: 400 });
      }
    } else if (taskId === "daily_ad_1") {
      dbTaskId = `daily_ad_1_${todayDateString}`;
      rewardAmount = 500;
    } else if (taskId === "daily_ad_2") {
      dbTaskId = `daily_ad_2_${todayDateString}`;
      rewardAmount = 500;

      // Validate: Must have claimed ad 1 first
      const prevClaimed = await prisma.userTask.findUnique({
        where: {
          userId_taskId: {
            userId: tmaUser.id,
            taskId: `daily_ad_1_${todayDateString}`
          }
        }
      });
      if (!prevClaimed) {
        return NextResponse.json({ success: false, error: "请先完成看广告赚积分 I" }, { status: 400 });
      }
    } else if (taskId === "daily_ad_3") {
      dbTaskId = `daily_ad_3_${todayDateString}`;
      rewardAmount = 500;

      // Validate: Must have claimed ad 2 first
      const prevClaimed = await prisma.userTask.findUnique({
        where: {
          userId_taskId: {
            userId: tmaUser.id,
            taskId: `daily_ad_2_${todayDateString}`
          }
        }
      });
      if (!prevClaimed) {
        return NextResponse.json({ success: false, error: "请先完成看广告赚积分 II" }, { status: 400 });
      }
    } else if (taskId === "join_telegram") {
      rewardAmount = 1000;
    } else if (taskId === "follow_x") {
      rewardAmount = 1000;
    } else {
      return NextResponse.json({ success: false, error: "未知的任务 ID" }, { status: 400 });
    }

    // 2. Perform atomic transaction to create UserTask & reward the user
    try {
      const updatedBalance = await prisma.$transaction(async (tx: any) => {
        // This will throw an error if the user has already claimed it due to the @@unique index
        await tx.userTask.create({
          data: {
            userId: tmaUser.id,
            taskId: dbTaskId,
            rewardClaimed: true,
            completedAt: now
          }
        });

        // Add reward to paper wallet
        const updatedWallet = await tx.paperWallet.update({
          where: { userId: tmaUser.id },
          data: {
            balance: { increment: rewardAmount }
          }
        });

        return updatedWallet.balance;
      });

      return NextResponse.json({
        success: true,
        message: "奖励领取成功",
        balance: updatedBalance
      });
    } catch (e: any) {
      // Handle unique constraint violation (code P2002 in Prisma)
      if (e.code === "P2002") {
        return NextResponse.json({ success: false, error: "您已经领取过该任务奖励了" }, { status: 400 });
      }
      throw e;
    }

  } catch (error) {
    console.error("[Tasks Claim POST API] Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
