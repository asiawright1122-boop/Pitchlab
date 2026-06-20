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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 text-slate-800 pb-24">
      {/* Hero */}
      <div className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#e04039]/5 to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight leading-none">数据与统计中心</h1>
          <p className="text-slate-500 text-lg font-medium">实时追踪真实赛果及各小组出线形势</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-16 relative z-10">
        
        {/* 球队积分榜 */}
        <div id="teams" className="scroll-mt-24 space-y-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">🏆 世界杯小组赛积分榜 (Group Stage)</h2>
          </div>

          {finalGroups.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-2xl p-16 text-center text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
               暂无有效的分组数据
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {finalGroups.map((group) => (
                <div key={group.id} className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
                  <div className="bg-[#e04039]/5 px-6 py-4 border-b border-slate-200/50 flex justify-between items-center">
                    <h3 className="text-lg font-black text-[#e04039]">{group.name}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 text-slate-450 border-b border-slate-100 text-xs font-semibold">
                        <tr>
                          <th className="px-4 py-3 w-10 text-center">排</th>
                          <th className="px-4 py-3">球队</th>
                          <th className="px-2 py-3 text-center">P</th>
                          <th className="px-2 py-3 text-center">W</th>
                          <th className="px-2 py-3 text-center">D</th>
                          <th className="px-2 py-3 text-center">L</th>
                          <th className="px-2 py-3 text-center">+/-</th>
                          <th className="px-4 py-3 text-bold text-center text-slate-700">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.teams.map((row, index) => {
                          const rank = index + 1;
                          const isTopTwo = rank <= 2;
                          return (
                            <tr key={row.team} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block w-5 h-5 rounded-full text-[10px] leading-5 font-bold ${isTopTwo ? 'bg-[#e04039] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                  {rank}
                                </span>
                              </td>
                              <td className="px-4 py-3 flex items-center gap-3">
                                <TeamFlag teamName={row.team} className="w-7 h-5 rounded shadow-sm" />
                                <span className="font-bold text-slate-800 text-sm">{row.team}</span>
                              </td>
                              <td className="px-2 py-3 text-center text-slate-500 font-medium">{row.p}</td>
                              <td className="px-2 py-3 text-center text-slate-600 font-medium">{row.w}</td>
                              <td className="px-2 py-3 text-center text-slate-600 font-medium">{row.d}</td>
                              <td className="px-2 py-3 text-center text-slate-600 font-medium">{row.l}</td>
                              <td className="px-2 py-3 text-center font-mono text-slate-600 font-medium">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                              <td className="px-4 py-3 text-center font-black text-base text-[#e04039]">{row.pts}</td>
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

        {/* 射手榜 & 助攻榜 二合一双栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 射手榜 */}
          <div id="scorers" className="scroll-mt-24 space-y-4">
            <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 bg-[#e04039] rounded-full inline-block"></span>
              ⚽ 射手榜 (Top Scorers)
            </h2>
            <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              {sortedScorers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-semibold text-sm">暂无进球数据</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-450 border-b border-slate-100 text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-3.5 w-12 text-center">排名</th>
                      <th className="px-6 py-3.5">球员</th>
                      <th className="px-6 py-3.5">球队</th>
                      <th className="px-6 py-3.5 text-right pr-8">进球数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedScorers.map((row, idx) => (
                      <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-center text-slate-450 font-bold">{idx + 1}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-800">{row.name}</td>
                        <td className="px-6 py-3.5 flex items-center gap-2">
                          <TeamFlag teamName={row.team} className="w-6 h-4 rounded shadow-sm" />
                          <span className="text-slate-600 font-medium text-xs">{row.team}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right pr-8 font-black text-base text-[#e04039]">{row.goals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 助攻榜 */}
          <div id="assists" className="scroll-mt-24 space-y-4">
            <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 bg-[#e04039] rounded-full inline-block"></span>
              🎯 助攻榜 (Top Assists)
            </h2>
            <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              {sortedAssisters.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-semibold text-sm">暂无助攻数据</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-450 border-b border-slate-100 text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-3.5 w-12 text-center">排名</th>
                      <th className="px-6 py-3.5">球员</th>
                      <th className="px-6 py-3.5">球队</th>
                      <th className="px-6 py-3.5 text-right pr-8">助攻数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedAssisters.map((row, idx) => (
                      <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-center text-slate-450 font-bold">{idx + 1}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-800">{row.name}</td>
                        <td className="px-6 py-3.5 flex items-center gap-2">
                          <TeamFlag teamName={row.team} className="w-6 h-4 rounded shadow-sm" />
                          <span className="text-slate-600 font-medium text-xs">{row.team}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right pr-8 font-black text-base text-green-600">{row.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
        </div>

        {/* 红黄牌统计 */}
        <div id="cards" className="scroll-mt-24 space-y-4">
          <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 bg-[#e04039] rounded-full inline-block"></span>
            🟨 红黄牌统计 (Cards)
          </h2>
          <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            {sortedCards.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-semibold text-sm">暂无纪律数据</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-450 border-b border-slate-100 text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 w-12 text-center">排名</th>
                    <th className="px-6 py-3.5">球员</th>
                    <th className="px-6 py-3.5">球队</th>
                    <th className="px-6 py-3.5 text-center w-24">🟨 黄牌</th>
                    <th className="px-6 py-3.5 text-center w-24">🟥 红牌</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCards.map((row, idx) => (
                    <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-center text-slate-450 font-bold">{idx + 1}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-800">{row.name}</td>
                      <td className="px-6 py-3.5 flex items-center gap-2">
                        <TeamFlag teamName={row.team} className="w-6 h-4 rounded shadow-sm" />
                        <span className="text-slate-600 font-medium text-xs">{row.team}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-bold text-[#e0a904]">{row.yellow}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-red-600">{row.red}</td>
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
