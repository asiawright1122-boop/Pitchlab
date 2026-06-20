import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function anonId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

export async function GET() {
  const wallets = await prisma.paperWallet.findMany({
    select: {
      userId: true,
      balance: true,
      user: {
        select: {
          paperTrades: {
            where: { status: { in: ["won", "lost"] } },
            select: { pnl: true, stake: true },
          },
        },
      },
    },
  });

  const rows = wallets
    .map((w) => {
      const settled = w.user.paperTrades;
      const totalPnl = settled.reduce((s, t) => s + (t.pnl ?? 0), 0);
      const totalStaked = settled.reduce((s, t) => s + t.stake, 0);
      const roi =
        totalStaked > 0 ? Math.round((totalPnl / totalStaked) * 10000) / 10000 : null;
      return {
        anon_id: anonId(w.userId),
        balance: Math.round(w.balance),
        settled_bets: settled.length,
        total_pnl: Math.round(totalPnl * 100) / 100,
        roi,
      };
    })
    .filter((r) => r.settled_bets >= 10)
    .sort((a, b) => {
      const ra = a.roi ?? -999;
      const rb = b.roi ?? -999;
      if (rb !== ra) return rb - ra;
      return b.total_pnl - a.total_pnl;
    })
    .slice(0, 25)
    .map((r, i) => ({ rank: i + 1, ...r }));

  const user = await getCurrentUser();
  const your_anon_id = user ? anonId(user.id) : null;
  const your_rank = your_anon_id
    ? rows.find((r) => r.anon_id === your_anon_id)?.rank ?? null
    : null;

  return NextResponse.json({
    disclaimer: "Anonymous handles — no emails. Research sandbox only.",
    kelly_fraction: 0.25,
    your_anon_id,
    your_rank,
    entries: rows,
  });
}
