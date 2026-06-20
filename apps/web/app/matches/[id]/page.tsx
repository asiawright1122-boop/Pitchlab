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
    <div className="bg-gradient-to-b from-slate-100 to-slate-50/50 min-h-[calc(100vh-64px)] pb-20 font-sans text-slate-800">
      {/* Match Header Hero */}
      <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 text-slate-850 pt-24 pb-24 relative overflow-hidden border-b border-slate-200/50">
        {/* Abstract Pitch Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] border border-slate-800 rounded-[100px] rotate-45"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-slate-800 rounded-full"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <Link href="/odds" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold mb-8 inline-flex items-center gap-2">
            ← 返回赔率中心
          </Link>
          
          <div className="text-center mb-6">
            <span className="px-3 py-1 bg-[#e04039]/5 text-[#e04039] rounded-full text-xs font-bold uppercase tracking-widest border border-[#e04039]/10">
              {fixture.league} • {fixture.kickoffUtc.toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center justify-center gap-8 md:gap-16">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-4 flex-1">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden flex items-center justify-center bg-white">
                <TeamFlag teamName={fixture.home} className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900">{fixture.home}</h1>
            </div>

            {/* VS Status */}
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-6xl font-black text-slate-850 mb-2">
                {fixture.status === "finished" ? `${fixture.homeGoals} - ${fixture.awayGoals}` : "VS"}
              </div>
              <div className="text-sm font-bold text-[#e04039] bg-[#e04039]/10 px-4 py-1.5 rounded-full">
                {fixture.status === "scheduled" ? fixture.kickoffUtc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "FT"}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-4 flex-1">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden flex items-center justify-center bg-white">
                <TeamFlag teamName={fixture.away} className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900">{fixture.away}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Data & Analytics */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <BettingMarkets 
              fixtureId={fixture.id}
              homeTeam={fixture.home}
              awayTeam={fixture.away}
              oddsSnapshots={fixture.oddsSnapshots}
              predictions={fixture.predictions}
            />

            {/* 立体草皮首发战术板 */}
            <LineupsField 
              lineups={liveDetails.lineups}
              homeTeam={fixture.home}
              awayTeam={fixture.away}
            />

            {/* 纵向赛况时间轴 */}
            <MatchEventsTimeline 
              events={liveDetails.events}
              homeTeam={fixture.home}
              awayTeam={fixture.away}
            />

            <TmaPanel fixtureId={fixture.id} isUnlocked={isUnlocked} />
          </div>

          {/* Right Column: Bet Slip */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BetSlip 
                fixtureId={fixture.id}
                home={fixture.home}
                away={fixture.away}
                league={fixture.league}
                kickoffUtc={fixture.kickoffUtc}
                latestOdds={latestOdds}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
