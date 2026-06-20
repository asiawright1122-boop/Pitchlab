import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";

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
    const tmaUser = await getOrCreateTmaUser(tmaUserPayload);

    if (!tmaUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // 1. Check daily login status
    // Daily login bonus is automatically granted during getOrCreateTmaUser
    const hasLoginBonusToday = tmaUser.lastLoginBonusAt && tmaUser.lastLoginBonusAt >= startOfToday;

    // 2. Check daily bet status
    const todayBetsCount = await prisma.paperTrade.count({
      where: {
        userId: tmaUser.id,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });
    const isDailyBetEligible = todayBetsCount >= 1;

    // Check if user has claimed daily bet reward today
    const dailyBetClaimKey = `daily_bet_${startOfToday.toISOString().split('T')[0]}`;
    const claimedDailyBet = await prisma.userTask.findUnique({
      where: {
        userId_taskId: {
          userId: tmaUser.id,
          taskId: dailyBetClaimKey
        }
      }
    });

    // 3. Check daily ad task status (up to 3 times per day)
    const todayDateString = startOfToday.toISOString().split('T')[0];
    const adClaimKeys = [
      `daily_ad_1_${todayDateString}`,
      `daily_ad_2_${todayDateString}`,
      `daily_ad_3_${todayDateString}`
    ];
    const claimedAds = await prisma.userTask.findMany({
      where: {
        userId: tmaUser.id,
        taskId: { in: adClaimKeys }
      }
    });
    const claimedAdsSet = new Set(claimedAds.map(t => t.taskId));

    // 4. Check one-time social tasks
    const socialTaskKeys = ["join_telegram", "follow_x"];
    const claimedSocialTasks = await prisma.userTask.findMany({
      where: {
        userId: tmaUser.id,
        taskId: { in: socialTaskKeys }
      }
    });
    const claimedSocialTasksSet = new Set(claimedSocialTasks.map(t => t.taskId));

    // Construct the structured response
    const tasks = [
      {
        id: "daily_login",
        title: "每日签到",
        description: "每日首次登录系统即可获得奖励",
        reward: 500,
        type: "daily",
        status: hasLoginBonusToday ? "claimed" : "claimable"
      },
      {
        id: "daily_bet",
        title: "每日模拟投注",
        description: "在模拟盘中完成至少 1 笔赛事投注",
        reward: 200,
        type: "daily",
        status: claimedDailyBet ? "claimed" : (isDailyBetEligible ? "claimable" : "todo")
      },
      {
        id: "daily_ad_1",
        title: "看广告赚积分 I",
        description: "观看 1 节赞助商视频广告即可获得奖励",
        reward: 500,
        type: "daily",
        status: claimedAdsSet.has(`daily_ad_1_${todayDateString}`) ? "claimed" : "todo"
      },
      {
        id: "daily_ad_2",
        title: "看广告赚积分 II",
        description: "观看第 2 节赞助商视频广告即可获得奖励",
        reward: 500,
        type: "daily",
        status: claimedAdsSet.has(`daily_ad_2_${todayDateString}`) ? "claimed" : 
                (claimedAdsSet.has(`daily_ad_1_${todayDateString}`) ? "todo" : "locked")
      },
      {
        id: "daily_ad_3",
        title: "看广告赚积分 III",
        description: "观看第 3 节赞助商视频广告即可获得奖励",
        reward: 500,
        type: "daily",
        status: claimedAdsSet.has(`daily_ad_3_${todayDateString}`) ? "claimed" : 
                (claimedAdsSet.has(`daily_ad_2_${todayDateString}`) ? "todo" : "locked")
      },
      {
        id: "join_telegram",
        title: "加入官方频道",
        description: "加入 Quant Edge 官方公告频道获取最新资讯",
        reward: 1000,
        type: "social",
        status: claimedSocialTasksSet.has("join_telegram") ? "claimed" : "todo",
        url: "https://t.me/QuantEdgeOfficial"
      },
      {
        id: "follow_x",
        title: "关注官方推特",
        description: "在社交平台 X (Twitter) 上关注 @QuantEdge",
        reward: 1000,
        type: "social",
        status: claimedSocialTasksSet.has("follow_x") ? "claimed" : "todo",
        url: "https://x.com/QuantEdge"
      }
    ];

    return NextResponse.json({
      success: true,
      tasks: tasks,
      balance: tmaUser.paperWallet?.balance || 0
    });

  } catch (error) {
    console.error("[Tasks GET API] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
