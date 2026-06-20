import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { ensurePaperWallet } from "@/lib/paper";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const wallet = await ensurePaperWallet(prisma, user.id);
  const open = await prisma.paperTrade.count({
    where: { userId: user.id, status: "open" },
  });
  const settled = await prisma.paperTrade.findMany({
    where: { userId: user.id, status: { in: ["won", "lost"] } },
    select: { pnl: true, stake: true },
  });
  const totalPnl = settled.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalStaked = settled.reduce((s, t) => s + t.stake, 0);

  return NextResponse.json({
    balance: wallet.balance,
    currency: wallet.currency,
    open_bets: open,
    settled_bets: settled.length,
    total_pnl: Math.round(totalPnl * 100) / 100,
    roi: totalStaked > 0 ? Math.round((totalPnl / totalStaked) * 10000) / 10000 : null,
    kelly_fraction: 0.25,
    disclaimer:
      "Simulated research bankroll only — no real money, no withdrawals, not betting advice. Stakes capped at quarter-Kelly vs balance.",
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const { action, amount } = (await request.json()) as {
    action?: "recharge" | "reset";
    amount?: number;
  };

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  const wallet = await ensurePaperWallet(prisma, user.id);

  if (action === "reset") {
    // 物理清空所有当前用户的交易，实现洗白重新开始
    await prisma.$transaction([
      prisma.paperTrade.deleteMany({
        where: { userId: user.id },
      }),
      prisma.paperWallet.update({
        where: { userId: user.id },
        data: { balance: 10000 },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      balance: 10000,
      note: "Account reset. All history cleared, balance restored to 10k u.",
    });
  }

  if (action === "recharge") {
    const addVal = Math.max(0, amount ?? 1000);
    const updated = await prisma.paperWallet.update({
      where: { userId: user.id },
      data: { balance: { increment: addVal } },
    });

    return NextResponse.json({
      ok: true,
      balance: updated.balance,
      note: `Charged +${addVal} u.`,
    });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

