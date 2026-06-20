import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settleOpenPaperTrades } from "@/lib/paper";
import { notifySettledTrades } from "@/lib/settlement-notifier";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. 简单的安全鉴权 (Header 中传入 x-webhook-token 进行比较)
    const token = request.headers.get("x-webhook-token");
    const expectedToken = process.env.WEBHOOK_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 解析请求体
    const body = await request.json();
    const { fixtureId, status, homeGoals, awayGoals } = body;

    if (!fixtureId || !status) {
      return NextResponse.json({ error: "Missing fixtureId or status" }, { status: 400 });
    }

    // 3. 更新 Fixture 的比分和状态
    const updatedFixture = await prisma.fixture.update({
      where: { id: fixtureId },
      data: {
        status: status.toLowerCase(),
        homeGoals: homeGoals !== undefined && homeGoals !== null ? Number(homeGoals) : undefined,
        awayGoals: awayGoals !== undefined && awayGoals !== null ? Number(awayGoals) : undefined,
      },
    });

    console.log(`[Webhook] Updated fixture ${fixtureId}: status=${updatedFixture.status}, score=${updatedFixture.homeGoals}:${updatedFixture.awayGoals}`);

    // 4. 调用模拟下注单结算逻辑
    const { count, settled } = await settleOpenPaperTrades(prisma);
    console.log(`[Webhook] Settle completed. Count: ${count}`);

    // 5. 如果有结算成功的交易，异步触发 Telegram 通知
    if (count > 0 && settled.length > 0) {
      notifySettledTrades(settled).catch((err) => {
        console.error("[Webhook] notifySettledTrades async error", err);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Fixture ${fixtureId} updated and settled successfully.`,
      fixture: {
        id: updatedFixture.id,
        status: updatedFixture.status,
        score: `${updatedFixture.homeGoals}:${updatedFixture.awayGoals}`,
      },
      settledCount: count,
      settledDetails: settled.map((s) => ({
        tradeId: s.id,
        selection: s.selection,
        won: s.won,
        pnl: s.pnl,
      })),
    });
  } catch (error: any) {
    console.error("[Webhook Error]", error);
    // 处理 Fixture 找不到的情况
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
