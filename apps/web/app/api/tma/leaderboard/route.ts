import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";

export const dynamic = "force-dynamic";

function anonId(userId: string): string {
  const hash = createHash("sha256").update(userId).digest("hex");
  return `Player_${hash.slice(0, 6)}`;
}

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

    // 1. Get all wallets sorted by balance descending
    const wallets = await prisma.paperWallet.findMany({
      orderBy: { balance: "desc" },
      select: {
        userId: true,
        balance: true,
        user: {
          select: {
            paperTrades: {
              where: { status: { in: ["won", "lost"] } },
              select: { pnl: true }
            }
          }
        }
      }
    });

    // 2. Map and build rows with anonymous IDs
    const rows = wallets.map((w, idx) => {
      const settledTrades = w.user.paperTrades;
      const totalPnl = settledTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
      
      return {
        rank: idx + 1,
        anon_id: anonId(w.userId),
        userId: w.userId,
        balance: Math.round(w.balance),
        settled_bets: settledTrades.length,
        total_pnl: Math.round(totalPnl * 100) / 100,
      };
    });

    const your_anon_id = anonId(tmaUser.id);
    const your_entry = rows.find(r => r.userId === tmaUser.id);
    const your_rank = your_entry ? your_entry.rank : rows.length + 1;
    const your_balance = your_entry ? your_entry.balance : 10000;
    const your_settled_bets = your_entry ? your_entry.settled_bets : 0;
    const your_pnl = your_entry ? your_entry.total_pnl : 0;

    // Filter out userId for response safety
    const entries = rows.slice(0, 50).map(({ userId, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      your_anon_id,
      your_rank,
      your_balance,
      your_settled_bets,
      your_pnl,
      entries
    });

  } catch (error) {
    console.error("[Leaderboard GET API] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
