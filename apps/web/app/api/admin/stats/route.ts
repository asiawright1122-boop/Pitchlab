import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { verifyAdminSession } from "@/lib/admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized Admin" }, { status: 401 });
    }

    const totalUsers = await prisma.user.count();
    
    // Active bets in 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeBets = await prisma.paperTrade.count({
      where: {
        createdAt: { gte: yesterday }
      }
    });

    // Total RU volume (sum of stakes)
    const volumeResult = await prisma.paperTrade.aggregate({
      _sum: { stake: true }
    });
    const ruVolume = volumeResult._sum.stake || 0;

    // Recent activity
    const recentActivity = await prisma.paperTrade.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            channelBindings: { where: { channel: 'telegram' } }
          }
        }
      }
    });

    const formattedActivity = recentActivity.map((trade: any) => {
      const tgBinding = trade.user?.channelBindings?.[0];
      const username = tgBinding ? `TG ID: ${tgBinding.externalId}` : `User ${trade.userId.substring(0,6)}`;
      return {
        id: trade.id,
        username,
        stake: trade.stake,
        selection: trade.selection,
        home: trade.home,
        timeAgo: Math.floor((Date.now() - trade.createdAt.getTime()) / 60000) // minutes ago
      };
    });

    return NextResponse.json({
      totalUsers,
      activeBets,
      ruVolume,
      recentActivity: formattedActivity
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
