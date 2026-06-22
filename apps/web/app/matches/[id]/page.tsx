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
import MatchDetailClient from "./MatchDetailClient";
import { MatteCard } from "@/components/ui/MatteCard";
import { ChevronLeft } from "lucide-react";
import { MatchSubscribeButton } from "@/components/MatchSubscribeButton";


async function syncFixtureOdds(fixtureId: string) {
  try {
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId }
    });
    if (!fixture) return;

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

    if (!Number.isNaN(Number(fixtureId))) {
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

  const hasMultiMarketOdds = fixture.oddsSnapshots.some(
    o => o.market !== "Match Winner" && o.market !== "1x2" && o.market !== "home" && o.market !== "draw" && o.market !== "away"
  );

  const latestSnapshot = fixture.oddsSnapshots.reduce((latest, current) => {
    return (!latest || current.takenAt > latest.takenAt) ? current : latest;
  }, null as any);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const isCooldownActive = latestSnapshot && latestSnapshot.takenAt > oneHourAgo;

  if (!hasMultiMarketOdds && fixture.status !== "finished" && !isCooldownActive) {
    await syncFixtureOdds(fixture.id);
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

  const user = await getCurrentUser();
  let isUnlocked = false;
  if (user) {
    const unlockRecord = await prisma.matchUnlock.findUnique({
      where: { userId_fixtureId: { userId: user.id, fixtureId: params.id } }
    });
    if (unlockRecord) isUnlocked = true;
  }

  const homeOdds = fixture.oddsSnapshots.filter(o => o.selection === "home" || (o.market === "Match Winner" && o.selection === "Home"));
  const drawOdds = fixture.oddsSnapshots.filter(o => o.selection === "draw" || (o.market === "Match Winner" && o.selection === "Draw"));
  const awayOdds = fixture.oddsSnapshots.filter(o => o.selection === "away" || (o.market === "Match Winner" && o.selection === "Away"));
  
  const latestOdds = {
    home: homeOdds.length > 0 ? homeOdds[homeOdds.length - 1].price : 0,
    draw: drawOdds.length > 0 ? drawOdds[drawOdds.length - 1].price : 0,
    away: awayOdds.length > 0 ? awayOdds[awayOdds.length - 1].price : 0,
  };

  const liveDetails = await getLiveMatchDetails(fixture.id, fixture.home, fixture.away);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-pitch text-white font-sans relative overflow-x-hidden">
      
      {/* Top Header */}
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#070a0b]/90 backdrop-blur-md border-b border-[#202b30]">
        <Link href="/" className="w-9 h-9 rounded-full bg-[#161e22] border border-[#202b30] flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors">
          <ChevronLeft size={16} />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-black text-white tracking-[0.2em] uppercase flex items-center gap-1.5">
            MATCH CENTER
          </span>
          <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mt-0.5">{fixture.league}</span>
        </div>
        <MatchSubscribeButton fixtureId={fixture.id} />
      </header>

      {/* Main Wrapper Client Component */}
      <MatchDetailClient 
        fixture={fixture} 
        liveDetails={liveDetails} 
        latestOdds={latestOdds} 
        initialOdds={fixture.oddsSnapshots} 
        isUnlocked={isUnlocked} 
      />

      {/* Persistent floating BetSlip at bottom */}
      <BetSlip 
        fixtureId={fixture.id} 
        home={fixture.home}
        away={fixture.away}
        league={fixture.league}
        kickoffUtc={fixture.kickoffUtc}
        latestOdds={latestOdds}
      />


    </div>
  );
}

