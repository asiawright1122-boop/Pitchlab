import { prisma } from "@/lib/prisma";
import OddsTable from "./OddsTable";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function OddsPage() {
  noStore(); // Force this route to be rendered dynamically and prevent any cached new Date()
  
  const user = await getCurrentUser();
  const now = new Date();
  
  // Split queries: upcoming first (guaranteed display), then recent finished (collapsible history)
  const upcomingFixtures = await prisma.fixture.findMany({
    where: {
      league: "WC",
      status: { in: ["scheduled", "SCHEDULED"] },
      kickoffUtc: { gt: now },
    },
    orderBy: { kickoffUtc: "asc" },
    include: {
      oddsSnapshots: { orderBy: { takenAt: "asc" } },
    },
    take: 50,
  });

  const finishedFixtures = await prisma.fixture.findMany({
    where: {
      league: "WC",
      status: { notIn: ["scheduled", "SCHEDULED"] },
    },
    orderBy: { kickoffUtc: "desc" },
    include: {
      oddsSnapshots: { orderBy: { takenAt: "asc" } },
    },
    take: 30, // Show only the 30 most recent finished matches
  });

  const fixtures = [...upcomingFixtures, ...finishedFixtures];

  // Fetch user wallet and trades if logged in
  let wallet = null;
  let trades: any[] = [];
  
  if (user) {
    wallet = await prisma.paperWallet.findUnique({
      where: { userId: user.id },
    });
    trades = await prisma.paperTrade.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  }

  // Map to the format expected by the client component
  const mappedFixtures = fixtures.map(f => ({
    id: f.id,
    home: f.home,
    away: f.away,
    kickoffUtc: f.kickoffUtc,
    status: f.status,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    stage: "GROUP_STAGE", // Using default as it's not in db model
    group: null, // Using null as group mapping not in current simplified db model
    oddsSnapshots: f.oddsSnapshots.map(o => ({
      selection: o.selection,
      price: o.price,
      takenAt: o.takenAt,
    })),
  }));

  const mappedTrades = trades.map(t => ({
    id: t.id,
    home: t.home,
    away: t.away,
    selection: t.selection,
    odds: t.odds,
    stake: t.stake,
    status: t.status,
    pnl: t.pnl,
    createdAt: t.createdAt.toISOString()
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 text-slate-800 pb-24 font-sans">
      {/* Decorative grids */}
      <div className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#e04039]/5 to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight leading-none">Odds Center</h1>
          <p className="text-slate-500 text-lg font-medium">Live odds from top bookmakers (Pinnacle Real Data)</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <OddsTable 
          fixtures={mappedFixtures} 
          userWallet={wallet ? { balance: wallet.balance, currency: wallet.currency } : null}
          userTrades={mappedTrades}
          isLoggedIn={!!user}
        />
      </div>
    </div>
  );
}
