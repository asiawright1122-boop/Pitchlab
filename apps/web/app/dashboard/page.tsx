import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // 1. Fetch Wallet
  const wallet = await prisma.paperWallet.findUnique({
    where: { userId: user.id },
  });

  // 2. Fetch Trades
  const trades = await prisma.paperTrade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      fixture: true,
    }
  });

  // 3. Fetch Unlocks (TMA)
  const unlocks = await prisma.matchUnlock.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      fixture: true,
    }
  });

  // 4. Fetch channelBindings (TG Connection)
  const bindings = await prisma.channelBinding.findMany({
    where: { userId: user.id },
  });

  // Map data to plain objects for Client Component
  const initialData = {
    user: {
      email: user.email,
      planId: user.planId || "Free",
      telegramBound: bindings.some(b => b.channel === "telegram"),
      telegramChatId: bindings.find(b => b.channel === "telegram")?.externalId || null,
    },
    wallet: {
      balance: wallet?.balance ?? 0,
      currency: wallet?.currency ?? "research_units",
    },
    trades: trades.map(t => ({
      id: t.id,
      fixtureId: t.fixtureId,
      home: t.home,
      away: t.away,
      market: t.market,
      selection: t.selection,
      odds: t.odds,
      stake: t.stake,
      status: t.status,
      pnl: t.pnl,
      createdAt: t.createdAt.toISOString(),
      kickoffUtc: t.kickoffUtc.toISOString(),
    })),
    unlocks: unlocks.map(u => ({
      id: u.id,
      fixtureId: u.fixtureId,
      home: u.fixture?.home,
      away: u.fixture?.away,
      method: u.method,
      amount: u.amount,
      createdAt: u.createdAt.toISOString(),
    })),
  };

  return <DashboardClient initialData={initialData} />;
}
