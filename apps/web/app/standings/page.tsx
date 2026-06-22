import React from 'react';
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import TeamFlag from '@/components/TeamFlag';

type TeamStats = {
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

type GroupData = {
  id: string;
  name: string;
  teams: TeamStats[];
};

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

const REAL_2026_CARDS = [
  { name: "Sphephelo Sithole", team: "South Africa", yellow: 0, red: 1 },
  { name: "César Montes", team: "Mexico", yellow: 0, red: 1 },
  { name: "Themba Zwane", team: "South Africa", yellow: 0, red: 1 },
  { name: "Jean-Ricner Bellegarde", team: "Haiti", yellow: 1, red: 0 },
  { name: "Micky van de Ven", team: "Netherlands", yellow: 1, red: 0 },
  { name: "Casemiro", team: "Brazil", yellow: 1, red: 0 },
  { name: "Crysencio Summerville", team: "Netherlands", yellow: 1, red: 0 },
  { name: "Miguel Almirón", team: "Paraguay", yellow: 1, red: 0 },
  { name: "Timothy Castagne", team: "Belgium", yellow: 1, red: 0 },
  { name: "Aaron Hickey", team: "Scotland", yellow: 1, red: 0 }
];

function normalizeTeamName(name: string): string {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  if (lower === "united states" || lower === "usa" || lower === "us") {
    return "United States";
  }
  if (lower === "czechia" || lower === "czech republic" || lower === "czech rep.") {
    return "Czechia";
  }
  if (lower === "ivory coast" || lower === "côte d'ivoire" || lower === "cote d'ivoire") {
    return "Ivory Coast";
  }
  if (lower === "bosnia-herzegovina" || lower === "bosnia and herzegovina" || lower === "bosnia") {
    return "Bosnia-Herzegovina";
  }
  if (lower === "cape verde islands" || lower === "cape verde" || lower === "cabo verde") {
    return "Cape Verde Islands";
  }
  if (lower === "congo dr" || lower === "dr congo") {
    return "Congo DR";
  }
  if (lower === "curaçao" || lower === "curacao") {
    return "Curaçao";
  }
  if (lower === "korea republic" || lower === "south korea" || lower === "korea, south" || lower === "rep. of korea") {
    return "South Korea";
  }
  return name;
}

async function fetchLiveMatchesFromFootballData(token: string): Promise<any[]> {
  const url = "https://api.football-data.org/v4/competitions/WC/matches";
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 60 } // cache for 1 minute
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.matches || [];
  } catch (e) {
    console.error("Failed to fetch live matches from football-data:", e);
    return [];
  }
}

async function fetchLiveScorersFromFootballData(token: string): Promise<any[]> {
  const url = "https://api.football-data.org/v4/competitions/WC/scorers";
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.scorers || []).map((item: any) => ({
      name: item.player?.name || "Unknown Player",
      team: item.team?.name || "Unknown Team",
      goals: item.goals || 0
    }));
  } catch (e) {
    console.error("Failed to fetch live scorers from football-data:", e);
    return [];
  }
}

async function fetchLiveAssistsFromESPN(): Promise<any[]> {
  const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics?season=2026";
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.stats || !Array.isArray(json.stats)) return [];
    const category = json.stats.find((s: any) => s.name === "assistsLeaders");
    if (!category || !Array.isArray(category.leaders)) return [];
    return category.leaders.map((leader: any) => ({
      name: leader.athlete?.displayName || leader.athlete?.shortName || "Unknown Player",
      team: leader.athlete?.team?.displayName || leader.athlete?.team?.name || "Unknown Team",
      assists: leader.value || 0
    }));
  } catch (e) {
    console.error("Failed to fetch live assists from ESPN:", e);
    return [];
  }
}

async function fetchFromAPIFootball(endpoint: string, apiKey: string): Promise<any[]> {
  const url = `${API_FOOTBALL_BASE}/${endpoint}?season=2026&league=1`;
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    if (!res.ok) {
      console.error(`Failed to fetch 2026 ${endpoint}: ${res.status}`);
      return [];
    }
    const json = await res.json();
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.warn(`API-Sports 2026 season error for ${endpoint}: ${JSON.stringify(json.errors)}`);
      return [];
    }
    return json.response || [];
  } catch (e) {
    console.error(`Failed to fetch 2026 ${endpoint}:`, e);
    return [];
  }
}

async function fetchTopScorers(apiKey: string): Promise<any[]> {
  const response = await fetchFromAPIFootball("players/topscorers", apiKey);
  return response.map((item: any) => {
    const stats = item.statistics?.[0] || {};
    return {
      name: item.player?.name || "",
      team: stats.team?.name || "",
      goals: stats.goals?.total || 0,
    };
  });
}

async function fetchTopAssists(apiKey: string): Promise<any[]> {
  const response = await fetchFromAPIFootball("players/topassists", apiKey);
  return response.map((item: any) => {
    const stats = item.statistics?.[0] || {};
    return {
      name: item.player?.name || "",
      team: stats.team?.name || "",
      assists: stats.goals?.assists || 0,
    };
  });
}

async function fetchTopCards(apiKey: string): Promise<any[]> {
  const response = await fetchFromAPIFootball("players/topyellowcards", apiKey);
  return response.map((item: any) => {
    const stats = item.statistics?.[0] || {};
    return {
      name: item.player?.name || "",
      team: stats.team?.name || "",
      yellow: stats.cards?.yellow || 0,
      red: stats.cards?.red || 0,
    };
  });
}


export default async function StandingsPage() {
  // 1. 读取公共数据目录下的 fixtures.json
  const dataFilePath = path.join(process.cwd(), 'public/data/fixtures.json');
  let officialGroups: { id: string; name: string; teams: string[] }[] = [];
  const allowedFixtureIds = new Set<string>();

  try {
    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    const fixturesData = JSON.parse(rawData);
    const jsonFixtures = fixturesData.fixtures || [];

    const groupsMap: Record<string, Set<string>> = {};
    jsonFixtures.forEach((f: any) => {
      if (f.id) {
        allowedFixtureIds.add(f.id);
      }
      if (f.group && f.home && f.away) {
        const groupName = f.group.toUpperCase();
        if (!groupsMap[groupName]) {
          groupsMap[groupName] = new Set();
        }
        groupsMap[groupName].add(f.home);
        groupsMap[groupName].add(f.away);
      }
    });

    officialGroups = Object.keys(groupsMap).sort().map(groupName => ({
      id: `group-${groupName}`,
      name: `Group ${groupName}`,
      teams: Array.from(groupsMap[groupName]).sort()
    }));
  } catch (error) {
    console.error("Failed to load official groups from public/data/fixtures.json:", error);
  }

  // Initialize all teams stats in map to 0
  const teamsMap: Record<string, TeamStats> = {};
  officialGroups.forEach(g => {
    g.teams.forEach(t => {
      teamsMap[t] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });
  });

  const footballDataToken = process.env.FOOTBALL_DATA_TOKEN || "ff84a62fe833457caeb1d1a3d874ff5b";
  const apiKey = process.env.API_FOOTBALL_KEY || "";
  
  let sortedScorers: any[] = [];
  let sortedAssisters: any[] = [];
  let sortedCards: any[] = [];

  // --- Real-time Synchronous Fetching ---
  let liveMatches: any[] = [];
  let liveScorers: any[] = [];
  let liveAssists: any[] = [];

  if (footballDataToken) {
    console.log("[StandingsPage] Fetching live data synchronously from football-data.org...");
    const [matches, scorers] = await Promise.all([
      fetchLiveMatchesFromFootballData(footballDataToken),
      fetchLiveScorersFromFootballData(footballDataToken)
    ]);
    liveMatches = matches;
    liveScorers = scorers;
  }

  console.log("[StandingsPage] Fetching assists from ESPN...");
  liveAssists = await fetchLiveAssistsFromESPN();

  // 1. Calculate Standings from Live Matches (or fallback to DB)
  if (liveMatches.length > 0) {
    console.log(`[StandingsPage] Calculating standings using ${liveMatches.length} live matches from API...`);
    for (const m of liveMatches) {
      const homeNorm = normalizeTeamName(m.homeTeam?.name);
      const awayNorm = normalizeTeamName(m.awayTeam?.name);
      
      if (teamsMap[homeNorm] && teamsMap[awayNorm]) {
        if (m.status === "FINISHED") {
          const hg = m.score?.fullTime?.home ?? 0;
          const ag = m.score?.fullTime?.away ?? 0;

          teamsMap[homeNorm].p += 1;
          teamsMap[awayNorm].p += 1;
          teamsMap[homeNorm].gf += hg;
          teamsMap[homeNorm].ga += ag;
          teamsMap[awayNorm].gf += ag;
          teamsMap[awayNorm].ga += hg;
          
          if (hg > ag) {
            teamsMap[homeNorm].w += 1;
            teamsMap[homeNorm].pts += 3;
            teamsMap[awayNorm].l += 1;
          } else if (hg < ag) {
            teamsMap[awayNorm].w += 1;
            teamsMap[awayNorm].pts += 3;
            teamsMap[homeNorm].l += 1;
          } else {
            teamsMap[homeNorm].d += 1;
            teamsMap[awayNorm].d += 1;
            teamsMap[homeNorm].pts += 1;
            teamsMap[awayNorm].pts += 1;
          }
        }
      }
    }
  } else {
    console.log("[StandingsPage] API matches empty, calculating from DB fixtures...");
    const dbFixtures = await prisma.fixture.findMany({
      where: { 
        league: 'WC',
        id: { in: Array.from(allowedFixtureIds) }
      },
    });
    for (const f of dbFixtures) {
      if (!teamsMap[f.home]) teamsMap[f.home] = { team: f.home, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
      if (!teamsMap[f.away]) teamsMap[f.away] = { team: f.away, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };

      if (f.status === 'FT' || f.status === 'finished' || f.status === 'AET' || f.status === 'PEN') {
        const hg = f.homeGoals || 0;
        const ag = f.awayGoals || 0;

        teamsMap[f.home].p += 1;
        teamsMap[f.away].p += 1;
        teamsMap[f.home].gf += hg;
        teamsMap[f.home].ga += ag;
        teamsMap[f.away].gf += ag;
        teamsMap[f.away].ga += hg;
        
        if (hg > ag) {
          teamsMap[f.home].w += 1;
          teamsMap[f.home].pts += 3;
          teamsMap[f.away].l += 1;
        } else if (hg < ag) {
          teamsMap[f.away].w += 1;
          teamsMap[f.away].pts += 3;
          teamsMap[f.home].l += 1;
        } else {
          teamsMap[f.home].d += 1;
          teamsMap[f.away].d += 1;
          teamsMap[f.home].pts += 1;
          teamsMap[f.away].pts += 1;
        }
      }
    }
  }

  // Helper to filter and normalize team names based on whitelist
  const allowedTeams = new Set(Object.keys(teamsMap));
  function filterAndNormalizePlayerStats<T extends { team: string }>(items: T[]): T[] {
    return items
      .map(item => {
        const norm = normalizeTeamName(item.team);
        if (allowedTeams.has(norm)) {
          return { ...item, team: norm };
        }
        return null;
      })
      .filter((item): item is T => item !== null);
  }

  // 2. Resolve Scorers, Assists, and Cards
  let loadedFromLiveAPI = false;
  if (liveScorers.length > 0 || liveAssists.length > 0) {
    sortedScorers = filterAndNormalizePlayerStats(liveScorers).slice(0, 10);
    sortedAssisters = filterAndNormalizePlayerStats(liveAssists).slice(0, 10);
    sortedCards = REAL_2026_CARDS.slice(0, 10);
    loadedFromLiveAPI = true;
    console.log("[StandingsPage] Standings player stats loaded synchronously from live APIs.");
  }

  // Fallback to static scraped file if live APIs returned nothing
  if (!loadedFromLiveAPI) {
    console.log("[StandingsPage] Live APIs returned no player data. Falling back to scraped JSON...");
    const scrapedFilePath = path.join(process.cwd(), 'public/data/standings-scraped.json');
    try {
      if (fs.existsSync(scrapedFilePath)) {
        const rawScraped = fs.readFileSync(scrapedFilePath, 'utf-8');
        const scrapedData = JSON.parse(rawScraped);
        sortedScorers = (scrapedData.scorers || []).slice(0, 10);
        sortedAssisters = (scrapedData.assists || []).slice(0, 10);
        sortedCards = (scrapedData.cards || []).slice(0, 10);
      }
    } catch (error) {
      console.error("[StandingsPage] Failed to load standings from scraped JSON:", error);
    }
  }

  // If both failed, use basic fallbacks (e.g. API-Football if key present)
  if (sortedScorers.length === 0 && apiKey) {
    console.log("[StandingsPage] Final fallback to API-Football query...");
    const [scorers, assisters, cards] = await Promise.all([
      fetchTopScorers(apiKey),
      fetchTopAssists(apiKey),
      fetchTopCards(apiKey),
    ]);
    sortedScorers = scorers.slice(0, 10);
    sortedAssisters = assisters.slice(0, 10);
    sortedCards = cards.slice(0, 10);
  }

  // 3. Map back to official groups and calculate Goal Difference
  const finalGroups: GroupData[] = officialGroups.map(g => {
    const groupTeams = g.teams.map(t => {
      const stats = teamsMap[t];
      stats.gd = stats.gf - stats.ga;
      return stats;
    });

    groupTeams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    return {
      id: g.id,
      name: g.name,
      teams: groupTeams,
    };
  });

  return (
    <div className="min-h-screen bg-[#f2f2f7] text-[#1c1c1e] pb-28 relative overflow-x-hidden select-none">
      {/* 🟢 Ambient background decorations */}
      <div className="absolute inset-0 bg-quant-mesh opacity-5 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#34c759]/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Mini App Sticky Header */}
      <header className="px-5 py-5 flex items-center justify-between sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#34c759] shadow-[0_0_8px_rgba(52,199,89,0.3)] animate-pulse"></div>
          <span className="text-[12px] font-black text-gray-900 tracking-[0.25em] uppercase">
            QUANT DATA HUB
          </span>
        </div>
        <span className="text-[8px] font-black text-[#248a3d] bg-[#34c759]/10 px-2.5 py-1 border border-[#34c759]/20 rounded-full tracking-widest uppercase">
          Live Stats
        </span>
      </header>

      {/* Main Container - Optimized for mobile view width */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-8 relative z-10">
        
        {/* 球队积分榜 */}
        <div id="teams" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-4.5 bg-[#34c759] rounded-full inline-block"></span>
            <h2 className="text-[12px] font-black text-gray-800 uppercase tracking-wider">Group Stage Standings</h2>
          </div>

          {finalGroups.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-gray-400 text-xs">
              暂无有效的分组数据
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {finalGroups.map((group) => (
                <div key={group.id} className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                  <div className="bg-[#34c759]/5 px-5 py-3 border-b border-gray-150 flex justify-between items-center">
                    <h3 className="text-xs font-black text-[#248a3d] uppercase tracking-wider">{group.name}</h3>
                    <span className="text-[7.5px] font-black text-gray-400 uppercase tracking-widest">Promotion Zone</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-gray-50/50 text-gray-400 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3 w-10 text-center text-gray-400">Pos</th>
                          <th className="px-4 py-3 text-gray-400">Team</th>
                          <th className="px-2 py-3 text-center text-gray-400">P</th>
                          <th className="px-2 py-3 text-center text-gray-400">W</th>
                          <th className="px-2 py-3 text-center text-gray-400">D</th>
                          <th className="px-2 py-3 text-center text-gray-400">L</th>
                          <th className="px-2 py-3 text-center text-gray-400">+/-</th>
                          <th className="px-4 py-3 text-bold text-center text-[#34c759]">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.teams.map((row, index) => {
                          const rank = index + 1;
                          const isTopTwo = rank <= 2;
                          return (
                            <tr key={row.team} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-flex w-4.5 h-4.5 items-center justify-center rounded-full text-[9px] font-black ${
                                  isTopTwo 
                                    ? 'bg-[#34c759] text-white shadow-[0_2px_8px_rgba(52,199,89,0.15)]' 
                                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                                }`}>
                                  {rank}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 flex items-center gap-2">
                                <TeamFlag teamName={row.team} className="w-6 h-4 rounded shadow-sm object-cover border border-gray-200" />
                                <span className="font-extrabold text-gray-800 text-xs uppercase truncate max-w-[90px]">{row.team}</span>
                              </td>
                              <td className="px-2 py-2.5 text-center text-gray-500 font-bold">{row.p}</td>
                              <td className="px-2 py-2.5 text-center text-gray-400">{row.w}</td>
                              <td className="px-2 py-2.5 text-center text-gray-400">{row.d}</td>
                              <td className="px-2 py-2.5 text-center text-gray-400">{row.l}</td>
                              <td className={`px-2 py-2.5 text-center font-mono text-xs font-black ${
                                row.gd > 0 ? 'text-[#34c759]' : row.gd < 0 ? 'text-[#ff3b30]' : 'text-gray-400'
                              }`}>
                                {row.gd > 0 ? `+${row.gd}` : row.gd}
                              </td>
                              <td className="px-4 py-2.5 text-center font-black text-xs text-[#248a3d]">{row.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 射手榜 */}
        <div id="scorers" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-4.5 bg-[#34c759] rounded-full inline-block"></span>
            <h2 className="text-[12px] font-black text-gray-800 uppercase tracking-wider">Top Scorers</h2>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {sortedScorers.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-semibold text-xs">暂无进球数据</div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50/50 text-gray-400 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-3 w-12 text-center text-gray-400">Rank</th>
                    <th className="px-5 py-3 text-gray-400">Player</th>
                    <th className="px-5 py-3 text-gray-400">Team</th>
                    <th className="px-5 py-3 text-right pr-6 text-[#34c759]">Goals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedScorers.map((row, idx) => (
                    <tr key={row.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-center text-gray-400 font-black">{idx + 1}</td>
                      <td className="px-5 py-3 font-extrabold text-gray-800 text-xs uppercase truncate max-w-[120px]">{row.name}</td>
                      <td className="px-5 py-3 flex items-center gap-2.5">
                        <TeamFlag teamName={row.team} className="w-6 h-4 rounded shadow-sm object-cover border border-gray-200" />
                        <span className="text-gray-500 font-extrabold text-[10px] uppercase truncate max-w-[80px]">{row.team}</span>
                      </td>
                      <td className="px-5 py-3 text-right pr-6 font-black text-sm text-[#248a3d]">{row.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 助攻榜 */}
        <div id="assists" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-4.5 bg-[#34c759] rounded-full inline-block"></span>
            <h2 className="text-[12px] font-black text-gray-800 uppercase tracking-wider">Top Assists</h2>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {sortedAssisters.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-semibold text-xs">暂无助攻数据</div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50/50 text-gray-400 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-3 w-12 text-center text-gray-400">Rank</th>
                    <th className="px-5 py-3 text-gray-400">Player</th>
                    <th className="px-5 py-3 text-gray-400">Team</th>
                    <th className="px-5 py-3 text-right pr-6 text-[#007aff]">Assists</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedAssisters.map((row, idx) => (
                    <tr key={row.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-center text-gray-400 font-black">{idx + 1}</td>
                      <td className="px-5 py-3 font-extrabold text-gray-800 text-xs uppercase truncate max-w-[120px]">{row.name}</td>
                      <td className="px-5 py-3 flex items-center gap-2.5">
                        <TeamFlag teamName={row.team} className="w-6 h-4 rounded shadow-sm object-cover border border-gray-200" />
                        <span className="text-gray-500 font-extrabold text-[10px] uppercase truncate max-w-[80px]">{row.team}</span>
                      </td>
                      <td className="px-5 py-3 text-right pr-6 font-black text-sm text-[#007aff]">{row.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 红黄牌统计 */}
        <div id="cards" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-4.5 bg-[#34c759] rounded-full inline-block"></span>
            <h2 className="text-[12px] font-black text-gray-800 uppercase tracking-wider">Discipline & Cards</h2>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {sortedCards.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-semibold text-xs">暂无纪律数据</div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50/50 text-gray-400 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-3 w-12 text-center text-gray-400">Rank</th>
                    <th className="px-5 py-3 text-gray-400">Player</th>
                    <th className="px-5 py-3 text-gray-400">Team</th>
                    <th className="px-4 py-3 text-center w-16 text-amber-600">Yellow</th>
                    <th className="px-4 py-3 text-center w-16 text-[#ff3b30]">Red</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedCards.map((row, idx) => (
                    <tr key={row.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-center text-gray-400 font-black">{idx + 1}</td>
                      <td className="px-5 py-3 font-extrabold text-gray-800 text-xs uppercase truncate max-w-[120px]">{row.name}</td>
                      <td className="px-5 py-3 flex items-center gap-2.5">
                        <TeamFlag teamName={row.team} className="w-6 h-4 rounded shadow-sm object-cover border border-gray-200" />
                        <span className="text-gray-500 font-extrabold text-[10px] uppercase truncate max-w-[80px]">{row.team}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-black text-sm text-amber-600">{row.yellow}</td>
                      <td className="px-4 py-3 text-center font-black text-sm text-[#ff3b30]">{row.red}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
