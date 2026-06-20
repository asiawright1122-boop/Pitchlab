import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";
import { getDataAdapter } from "@/lib/data-adapter/factory";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-tma-init-data");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!initData || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = validateInitData(initData, token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid Telegram Auth Data" }, { status: 403 });
    }

    let { fixtureId, selection, stake, odds } = await request.json();
    stake = Number(stake);
    odds = Number(odds);

    if (!fixtureId || !selection || Number.isNaN(stake) || Number.isNaN(odds)) {
      return NextResponse.json({ success: false, error: "Missing or invalid fields" }, { status: 400 });
    }

    if (stake <= 0 || stake % 100 !== 0) {
      return NextResponse.json({ success: false, error: "Stake must be a multiple of 100" }, { status: 400 });
    }

    const dbUser = await getOrCreateTmaUser(payload.user, payload.startParam);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get wallet
    const wallet = await prisma.paperWallet.findUnique({
      where: { userId: dbUser.id }
    });

    if (!wallet || wallet.balance < stake) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Check if trade already exists
    const existing = await prisma.paperTrade.findFirst({
      where: { userId: dbUser.id, fixtureId, status: "open" }
    });

    if (existing) {
      return NextResponse.json({ error: "You already have an open bet on this match" }, { status: 400 });
    }

    // Check match validity and retrieve details
    const adapter = getDataAdapter();
    const upcoming = await adapter.getUpcomingFixtures(["WC", "PL", "PD", "BL1", "SA", "FL1"], 48);
    const matchedFixture = upcoming.find(f => f.id === fixtureId);

    if (!matchedFixture) {
      return NextResponse.json({ error: "Match not found or market closed" }, { status: 404 });
    }

    // Ensure Fixture exists in DB (to satisfy Foreign Key constraints)
    await prisma.fixture.upsert({
      where: { id: fixtureId },
      create: {
        id: fixtureId,
        league: matchedFixture.league,
        home: matchedFixture.home,
        away: matchedFixture.away,
        kickoffUtc: new Date(matchedFixture.kickoffUtc),
        status: matchedFixture.status,
      },
      update: {
        status: matchedFixture.status,
      }
    });

    // Execute atomic transaction: deduct balance & create trade with optimistic locking
    await prisma.$transaction(async (tx: any) => {
      // Use updateMany to ensure we only decrement if the balance is truly sufficient
      // at the exact moment of execution, preventing concurrent double-spending.
      const walletUpdate = await tx.paperWallet.updateMany({
        where: { 
          userId: dbUser.id,
          balance: { gte: stake }
        },
        data: { balance: { decrement: stake } },
      });

      if (walletUpdate.count === 0) {
        throw new Error("Insufficient balance or concurrent transaction conflict");
      }

      await tx.paperTrade.create({
        data: {
          userId: dbUser.id,
          fixtureId,
          league: matchedFixture.league,
          home: matchedFixture.home,
          away: matchedFixture.away,
          kickoffUtc: new Date(matchedFixture.kickoffUtc),
          selection,
          odds,
          stake,
          status: "open",
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Bet placed successfully"
    });

  } catch (error: any) {
    console.error("Error placing bet:", error);
    if (error.message === "Insufficient balance or concurrent transaction conflict") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
