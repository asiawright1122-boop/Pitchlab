import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { maxPaperStake } from "@/lib/paper-bet";
import {
  MAX_STAKE_PER_BET,
  MIN_STAKE,
  ensurePaperWallet,
  settleOpenPaperTrades,
} from "@/lib/paper";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEL = new Set(["H", "D", "A"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  await settleOpenPaperTrades(prisma);

  const trades = await prisma.paperTrade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    trades: trades.map((t) => ({
      id: t.id,
      fixture_id: t.fixtureId,
      league: t.league,
      home: t.home,
      away: t.away,
      market: t.market,
      selection: t.selection,
      odds: t.odds,
      stake: t.stake,
      status: t.status,
      pnl: t.pnl,
      kickoff_utc: t.kickoffUtc.toISOString(),
      settled_at: t.settledAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    fixture_id?: string;
    league?: string;
    home?: string;
    away?: string;
    kickoff_utc?: string;
    market?: string;
    selection?: string;
    odds?: number;
    stake?: number;
    model_prob?: number;
  };

  let {
    fixture_id,
    league,
    home,
    away,
    kickoff_utc,
    market,
    selection,
    odds,
    stake,
  } = body;
  
  market = market || "1x2";
  stake = Number(stake);
  odds = Number(odds);

  if (!fixture_id || !league || !home || !away || !kickoff_utc || !selection || Number.isNaN(odds) || Number.isNaN(stake)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (market === "1x2" && !SEL.has(selection)) {
    return NextResponse.json({ error: "selection must be H, D, or A" }, { status: 400 });
  }
  if (odds < 1.01 || stake < MIN_STAKE || stake > MAX_STAKE_PER_BET) {
    return NextResponse.json({ error: "invalid odds or stake" }, { status: 400 });
  }

  const kickoff = new Date(kickoff_utc);
  if (Number.isNaN(kickoff.getTime())) {
    return NextResponse.json({ error: "invalid kickoff_utc" }, { status: 400 });
  }

  const wallet = await ensurePaperWallet(prisma, user.id);
  if (wallet.balance < stake) {
    return NextResponse.json({ error: "insufficient balance" }, { status: 400 });
  }

  const prob =
    typeof body.model_prob === "number" && body.model_prob > 0
      ? body.model_prob
      : 1 / odds;
  const kellyCap = maxPaperStake(wallet.balance, prob, odds);
  if (stake > kellyCap) {
    return NextResponse.json(
      { error: `stake exceeds quarter-Kelly cap (${kellyCap}u)` },
      { status: 400 }
    );
  }

  const fixture = await prisma.fixture.findUnique({ where: { id: fixture_id } });
  if (fixture?.status === "finished") {
    return NextResponse.json({ error: "fixture already finished" }, { status: 400 });
  }

  await prisma.fixture.upsert({
    where: { id: fixture_id },
    create: {
      id: fixture_id,
      league,
      home,
      away,
      kickoffUtc: kickoff,
      status: "scheduled",
    },
    update: {},
  });

  const existing = await prisma.paperTrade.findFirst({
    where: { userId: user.id, fixtureId: fixture_id, market, status: "open" },
  });
  if (existing) {
    return NextResponse.json({ error: "already have open bet on this fixture for this market" }, { status: 400 });
  }

  let trade;
  try {
    trade = await prisma.$transaction(async (tx) => {
      const walletUpdate = await tx.paperWallet.updateMany({
        where: { 
          userId: user.id,
          balance: { gte: stake }
        },
        data: { balance: { decrement: stake } },
      });
      
      if (walletUpdate.count === 0) {
        throw new Error("Insufficient balance or concurrent transaction conflict");
      }

      return tx.paperTrade.create({
        data: {
          userId: user.id,
          fixtureId: fixture_id,
          league,
          home,
          away,
          kickoffUtc: kickoff,
          market: market!,
          selection,
          odds,
          stake,
        },
      });
    });
  } catch (error: any) {
    if (error.message === "Insufficient balance or concurrent transaction conflict") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const updated = await prisma.paperWallet.findUniqueOrThrow({ where: { userId: user.id } });

  return NextResponse.json({
    ok: true,
    trade: { id: trade.id, status: trade.status },
    balance: updated.balance,
  });
}

