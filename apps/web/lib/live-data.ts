import { ApiFootballProvider } from "./providers/api-football";

export interface LiveMatchDetails {
  lineups: any[];
  stats: any[];
  events: any[];
}

/**
 * Gets real live match details from API-Football,
 * or generates realistic mock data for WC mock/simulation matches.
 */
export async function getLiveMatchDetails(
  fixtureId: string,
  home: string,
  away: string
): Promise<LiveMatchDetails> {
  const isNumericId = !Number.isNaN(Number(fixtureId));

  // 1. 尝试从真实 API-Football 抓取
  if (isNumericId) {
    try {
      const provider = new ApiFootballProvider();
      const [lineups, stats, events] = await Promise.all([
        provider.fetchLineupsByFixture(fixtureId).catch(() => []),
        provider.fetchStatsByFixture(fixtureId).catch(() => []),
        provider.fetchEventsByFixture(fixtureId).catch(() => [])
      ]);

      if (lineups.length > 0 || stats.length > 0 || events.length > 0) {
        return { lineups, stats, events };
      }
    } catch (err) {
      console.warn(`[LiveDetails] Real API sync failed for ${fixtureId}, falling back to mock details.`, err);
    }
  }

  // 2. 为模拟赛事或 API 失败时的降级 Mock 垫片
  return getMockMatchDetails(home, away);
}

function getMockMatchDetails(home: string, away: string): LiveMatchDetails {
  // 生成经典 4-3-3 / 4-2-3-1 阵容
  const homeLineup = getMockTeamLineup(home, "4-2-3-1", true);
  const awayLineup = getMockTeamLineup(away, "4-3-3", false);

  const stats = [
    {
      team: { name: home },
      statistics: [
        { type: "Ball Possession", value: "54%" },
        { type: "Total Shots", value: 14 },
        { type: "Shots on Goal", value: 6 },
        { type: "Corner Kicks", value: 6 },
        { type: "Fouls", value: 11 },
        { type: "Yellow Cards", value: 1 }
      ]
    },
    {
      team: { name: away },
      statistics: [
        { type: "Ball Possession", value: "46%" },
        { type: "Total Shots", value: 9 },
        { type: "Shots on Goal", value: 3 },
        { type: "Corner Kicks", value: 4 },
        { type: "Fouls", value: 15 },
        { type: "Yellow Cards", value: 2 }
      ]
    }
  ];

  const events = [
    {
      time: { elapsed: 18, extra: null },
      team: { name: home },
      player: { name: home === "Czechia" ? "Tomas Soucek" : "Captain H." },
      assist: { name: home === "Czechia" ? "Vladimir Coufal" : "Winger L." },
      type: "Goal",
      detail: "Normal Goal"
    },
    {
      time: { elapsed: 35, extra: null },
      team: { name: away },
      player: { name: away === "South Africa" ? "Teboho Mokoena" : "Midfielder A." },
      assist: null,
      type: "Card",
      detail: "Yellow Card"
    },
    {
      time: { elapsed: 58, extra: null },
      team: { name: home },
      player: { name: home === "Czechia" ? "Patrik Schick" : "Striker S." },
      assist: null,
      type: "Goal",
      detail: "Penalty"
    },
    {
      time: { elapsed: 65, extra: null },
      team: { name: away },
      player: { name: away === "South Africa" ? "Percy Tau" : "Forward T." },
      assist: { name: away === "South Africa" ? "Themba Zwane" : "Midfielder Z." },
      type: "Goal",
      detail: "Normal Goal"
    },
    {
      time: { elapsed: 72, extra: null },
      team: { name: home },
      player: { name: home === "Czechia" ? "Tomas Holes" : "Defender D." },
      assist: null,
      type: "Card",
      detail: "Yellow Card"
    },
    {
      time: { elapsed: 80, extra: null },
      team: { name: away },
      player: { name: away === "South Africa" ? "Aubrey Modiba" : "Defender M." },
      assist: null,
      type: "Card",
      detail: "Yellow Card"
    }
  ];

  return {
    lineups: [homeLineup, awayLineup],
    stats,
    events
  };
}

function getMockTeamLineup(teamName: string, formation: string, isHome: boolean) {
  // 根据队伍名提供特定球员，或者提供通用名单
  const czechPlayers = [
    { name: "Jindrich Stanek", number: 1, pos: "G", grid: "1:1", rating: "7.1" },
    { name: "Tomas Holes", number: 3, pos: "D", grid: "2:1", rating: "6.8" },
    { name: "Robin Hranac", number: 4, pos: "D", grid: "2:2", rating: "7.0" },
    { name: "Ladislav Krejci", number: 18, pos: "D", grid: "2:3", rating: "6.9" },
    { name: "Vladimir Coufal", number: 5, pos: "D", grid: "2:4", rating: "7.4" },
    { name: "Tomas Soucek", number: 22, pos: "M", grid: "3:1", rating: "8.2" },
    { name: "Lukas Provod", number: 14, pos: "M", grid: "3:2", rating: "7.3" },
    { name: "Antonin Barak", number: 7, pos: "M", grid: "3:3", rating: "7.1" },
    { name: "Vaclav Cerny", number: 17, pos: "F", grid: "4:1", rating: "6.7" },
    { name: "Adam Hlozek", number: 9, pos: "F", grid: "4:2", rating: "6.8" },
    { name: "Patrik Schick", number: 10, pos: "F", grid: "4:3", rating: "7.9" }
  ];

  const saPlayers = [
    { name: "Ronwen Williams", number: 1, pos: "G", grid: "1:1", rating: "7.3" },
    { name: "Khuliso Mudau", number: 2, pos: "D", grid: "2:1", rating: "6.7" },
    { name: "Mothobi Mvala", number: 3, pos: "D", grid: "2:2", rating: "6.9" },
    { name: "Grant Kekana", number: 4, pos: "D", grid: "2:3", rating: "6.8" },
    { name: "Aubrey Modiba", number: 6, pos: "D", grid: "2:4", rating: "7.0" },
    { name: "Teboho Mokoena", number: 8, pos: "M", grid: "3:1", rating: "7.5" },
    { name: "Sphephelo Sithole", number: 15, pos: "M", grid: "3:2", rating: "6.9" },
    { name: "Themba Zwane", number: 10, pos: "M", grid: "3:3", rating: "7.2" },
    { name: "Thapelo Morena", number: 11, pos: "F", grid: "4:1", rating: "6.8" },
    { name: "Evidence Makgopa", number: 9, pos: "F", grid: "4:2", rating: "6.6" },
    { name: "Percy Tau", number: 7, pos: "F", grid: "4:3", rating: "7.8" }
  ];

  const genericPlayers = [
    { name: "Keeper Goalie", number: 1, pos: "G", grid: "1:1", rating: "6.8" },
    { name: "Def Back-L", number: 2, pos: "D", grid: "2:1", rating: "6.7" },
    { name: "Def Center-L", number: 4, pos: "D", grid: "2:2", rating: "6.9" },
    { name: "Def Center-R", number: 5, pos: "D", grid: "2:3", rating: "7.0" },
    { name: "Def Back-R", number: 3, pos: "D", grid: "2:4", rating: "6.8" },
    { name: "Mid Hold", number: 6, pos: "M", grid: "3:1", rating: "7.1" },
    { name: "Mid Left", number: 8, pos: "M", grid: "3:2", rating: "6.8" },
    { name: "Mid Right", number: 10, pos: "M", grid: "3:3", rating: "7.2" },
    { name: "For Left", number: 11, pos: "F", grid: "4:1", rating: "6.9" },
    { name: "For Center", number: 9, pos: "F", grid: "4:2", rating: "7.0" },
    { name: "For Right", number: 7, pos: "F", grid: "4:3", rating: "6.7" }
  ];

  let players = genericPlayers;
  if (teamName === "Czechia") players = czechPlayers;
  else if (teamName === "South Africa") players = saPlayers;
  else {
    // 动态微调号码和名字使其看起来逼真
    players = genericPlayers.map(p => ({
      ...p,
      name: `${p.name.split(" ")[0]} ${teamName.slice(0, 3)}`,
      rating: (6.5 + Math.random() * 1.5).toFixed(1)
    }));
  }

  return {
    team: { name: teamName },
    formation: formation,
    startXI: players.map(p => ({ player: p })),
    substitutes: []
  };
}
