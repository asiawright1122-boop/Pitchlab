import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import BetSlip from "./BetSlip";
import TmaPanel from "./TmaPanel";
import BettingMarkets from "./BettingMarkets";
import Link from "next/link";
import TeamFlag from "@/components/TeamFlag";
import { ApiFootballProvider } from "@/lib/providers/api-football";
import { TheOddsApiProvider } from "@/lib/providers/the-odds-api";
import { getLiveMatchDetails } from "@/lib/live-data";
import LineupsField from "./LineupsField";
import MatchEventsTimeline from "./MatchEventsTimeline";

async function syncFixtureOdds(fixtureId: string) {
  try {
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId }
    });
    if (!fixture) return;

    // 1. 优先尝试从 The Odds API 抓取真实的实时赔率 (基于球队名字模糊匹配，不仅支持真实ID，同时也支持 Mock 赛事)
    try {
      const theOddsApi = new TheOddsApiProvider();
      const snapshots = await theOddsApi.fetchOddsForMatch(
        fixture.league,
        fixture.home,
        fixture.away
      );
      if (snapshots && snapshots.length > 0) {
        const snapshotsWithId = snapshots.map(s => ({
          ...s,
          fixtureId,
        }));
        await prisma.oddsSnapshot.createMany({
          data: snapshotsWithId,
          skipDuplicates: true,
        });
        console.log(`[OddsSync] Synced ${snapshotsWithId.length} real odds snapshots from The Odds API for fixture ${fixtureId}`);
        return;
      }
    } catch (err) {
      console.warn(`[OddsSync] The Odds API sync failed or no match found for ${fixtureId}:`, err);
    }

    // 2. 如果 The Odds API 没有匹配到(或者报错)，且是真实数字 ID，我们降级调用 API-Football
    if (!Number.isNaN(Number(fixtureId))) {
      const key = process.env.API_FOOTBALL_KEY || "482d492d8fabe6f52c434844ecb4387d";
      const provider = new ApiFootballProvider();
      const response = await provider.fetchOddsByFixture(fixtureId);
      if (response && response.length > 0) {
        const bookmaker = response[0].bookmakers.find(b => b.id === 17) || response[0].bookmakers[0];
        if (bookmaker) {
          const snapshotsData = [];
          const now = new Date();

          for (const bet of bookmaker.bets) {
            for (const val of bet.values) {
              const price = parseFloat(val.odd);
              if (Number.isNaN(price)) continue;

              snapshotsData.push({
                fixtureId,
                book: bookmaker.name.toLowerCase(),
                market: bet.name,
                selection: val.value,
                price,
                takenAt: now,
              });
            }
          }

          if (snapshotsData.length > 0) {
            await prisma.oddsSnapshot.createMany({
              data: snapshotsData,
              skipDuplicates: true,
            });
            console.log(`[OddsSync] Synced ${snapshotsData.length} real odds snapshots from API-Football for fixture ${fixtureId}`);
            return;
          }
        }
      }
    }

    // 3. 全局禁用模拟赔率数据：当无真实赔率数据时不做任何模拟填充
    console.log(`[OddsSync] No real odds found for fixture ${fixtureId}. Leaving as empty.`);

  } catch (error) {
    console.error(`[OddsSync] Failed to sync real odds for fixture ${fixtureId}:`, error);
  }
}

export default async function MatchPage({ params }: { params: { id: string } }) {
  let fixture = await prisma.fixture.findUnique({
    where: { id: params.id },
    include: {
      oddsSnapshots: {
        orderBy: { takenAt: "asc" }
      },
      predictions: true
    }
  });

  if (!fixture) notFound();

  // Check if we already have non-1x2 odds snapshots
  const hasMultiMarketOdds = fixture.oddsSnapshots.some(
    o => o.market !== "Match Winner" && o.market !== "1x2" && o.market !== "home" && o.market !== "draw" && o.market !== "away"
  );

  // 防爆 API 冷却判定：如果最近一次抓取时间在 1 小时内，则跳过本次同步网络请求
  const latestSnapshot = fixture.oddsSnapshots.reduce((latest, current) => {
    return (!latest || current.takenAt > latest.takenAt) ? current : latest;
  }, null as any);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const isCooldownActive = latestSnapshot && latestSnapshot.takenAt > oneHourAgo;

  if (!hasMultiMarketOdds && fixture.status !== "finished" && !isCooldownActive) {
    await syncFixtureOdds(fixture.id);
    // Refresh fixture data
    fixture = await prisma.fixture.findUnique({
      where: { id: params.id },
      include: {
        oddsSnapshots: {
          orderBy: { takenAt: "asc" }
        },
        predictions: true
      }
    }) || fixture;
  }

  // Check if current user has unlocked the TMA report
  const user = await getCurrentUser();
  let isUnlocked = false;
  if (user) {
    const unlockRecord = await prisma.matchUnlock.findUnique({
      where: { userId_fixtureId: { userId: user.id, fixtureId: params.id } }
    });
    if (unlockRecord) isUnlocked = true;
  }

  // Extract latest odds
  const homeOdds = fixture.oddsSnapshots.filter(o => o.selection === "home" || (o.market === "Match Winner" && o.selection === "Home"));
  const drawOdds = fixture.oddsSnapshots.filter(o => o.selection === "draw" || (o.market === "Match Winner" && o.selection === "Draw"));
  const awayOdds = fixture.oddsSnapshots.filter(o => o.selection === "away" || (o.market === "Match Winner" && o.selection === "Away"));
  
  const latestOdds = {
    home: homeOdds.length > 0 ? homeOdds[homeOdds.length - 1].price : 0,
    draw: drawOdds.length > 0 ? drawOdds[drawOdds.length - 1].price : 0,
    away: awayOdds.length > 0 ? awayOdds[awayOdds.length - 1].price : 0,
  };

  // 获取比赛实时/垫片数据 (阵容、事件、技术统计)
  const liveDetails = await getLiveMatchDetails(fixture.id, fixture.home, fixture.away);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0b132b] text-white font-sans relative overflow-x-hidden">
      {/* Deep Blue Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b132b] via-[#111c3a] to-[#1a2b56] -z-10 pointer-events-none"></div>

      {/* Top Header */}
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 z-20 bg-[#0b132b]/80 backdrop-blur-md">
        <Link href="/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-white tracking-widest uppercase">LIVE MATCH</span>
          <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full mt-1 border border-white/10">{fixture.league}</span>
        </div>
        <div className="w-8"></div> {/* Spacer for centering */}
      </header>

      {/* Scoreboard Area */}
      <div className="px-4 py-8 flex items-center justify-between relative">
        {/* Home Team */}
        <div className="flex flex-col items-center flex-1 gap-3 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-[#111c3a] border border-white/10 shadow-xl overflow-hidden flex items-center justify-center p-2 relative">
            <div className="absolute -top-1 -right-1 text-yellow-400 text-[10px] tracking-tighter">★★</div>
            <TeamFlag teamName={fixture.home} className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">{fixture.home.substring(0, 3)}</h2>
            <p className="text-[10px] text-slate-400 font-medium">Home</p>
          </div>
        </div>

        {/* Score & Status */}
        <div className="flex flex-col items-center justify-center px-4 relative z-10">
          <div className="text-5xl font-black text-white tracking-tighter drop-shadow-lg mb-1">
            {fixture.status === "finished" ? `${fixture.homeGoals} - ${fixture.awayGoals}` : fixture.status === "scheduled" ? "VS" : "2 - 1"}
          </div>
          {fixture.status === "scheduled" ? (
            <div className="text-xs font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {fixture.kickoffUtc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-green-400">75'</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">2ND HALF</span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center flex-1 gap-3 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-[#111c3a] border border-white/10 shadow-xl overflow-hidden flex items-center justify-center p-2">
            <TeamFlag teamName={fixture.away} className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">{fixture.away.substring(0, 3)}</h2>
            <p className="text-[10px] text-slate-400 font-medium">Away</p>
          </div>
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="px-6 py-2">
        <div className="flex justify-center items-center gap-2 bg-[#111c3a]/80 backdrop-blur-md p-1.5 rounded-full border border-white/5">
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Timeline
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path></svg>
            Lineups
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold bg-white text-[#0b132b] shadow-md shadow-white/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
            Odds
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        
        {/* Match Odds Card */}
        <div className="bg-[#111c3a]/60 backdrop-blur-md rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Subtle glow effect behind card */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
          
          <h3 className="text-xs font-bold text-slate-300 text-center uppercase tracking-widest mb-5">Match Odds</h3>
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Match Winner</p>
          
          <div className="grid grid-cols-3 gap-3">
            {/* Home Odds */}
            <button className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-white/10 transition group">
              <div className="w-8 h-8 rounded-full bg-[#1a2b56] border border-white/10 flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform">
                 <TeamFlag teamName={fixture.home} className="w-full h-full object-cover rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HOME</span>
              <div className="w-full py-2 bg-[#0b132b] rounded-xl border border-blue-500/30 text-center">
                <span className="text-xs font-bold text-white block mb-0.5">1 ({fixture.home.substring(0,3).toUpperCase()})</span>
                <span className="text-lg font-black text-blue-400">{latestOdds.home ? latestOdds.home.toFixed(2) : "--"}</span>
              </div>
            </button>

            {/* Draw Odds */}
            <button className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-white/10 transition group">
              <div className="w-8 h-8 rounded-full bg-[#1a2b56] border border-white/10 flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform">
                <div className="w-full h-full rounded-full bg-slate-500 relative overflow-hidden">
                  <div className="absolute inset-0 flex">
                     <div className="flex-1 bg-slate-200"></div>
                     <div className="flex-1 bg-slate-400"></div>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DRAW</span>
              <div className="w-full py-2 bg-[#0b132b] rounded-xl border border-white/10 text-center">
                <span className="text-xs font-bold text-white block mb-0.5">X (DRAW)</span>
                <span className="text-lg font-black text-white">{latestOdds.draw ? latestOdds.draw.toFixed(2) : "--"}</span>
              </div>
            </button>

            {/* Away Odds */}
            <button className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-white/10 transition group">
              <div className="w-8 h-8 rounded-full bg-[#1a2b56] border border-white/10 flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform">
                 <TeamFlag teamName={fixture.away} className="w-full h-full object-cover rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AWAY</span>
              <div className="w-full py-2 bg-[#0b132b] rounded-xl border border-red-500/30 text-center">
                <span className="text-xs font-bold text-white block mb-0.5">2 ({fixture.away.substring(0,3).toUpperCase()})</span>
                <span className="text-lg font-black text-red-400">{latestOdds.away ? latestOdds.away.toFixed(2) : "--"}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Existing Components (TmaPanel, etc) hidden initially or placed below */}
        <div className="mt-8">
           <TmaPanel fixtureId={fixture.id} isUnlocked={isUnlocked} />
        </div>

      </div>
    </div>
  );
}
