export interface TheOddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface TheOddsApiMarket {
  key: "h2h" | "spreads" | "totals";
  last_update: string;
  outcomes: TheOddsApiOutcome[];
}

export interface TheOddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: TheOddsApiMarket[];
}

export interface TheOddsApiMatchResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: TheOddsApiBookmaker[];
}

export class TheOddsApiProvider {
  private apiKey: string;
  private baseUrl = "https://api.the-odds-api.com/v4/sports";

  constructor() {
    const key = process.env.THE_ODDS_API_KEY;
    if (!key) {
      throw new Error("THE_ODDS_API_KEY is missing in environment variables.");
    }
    this.apiKey = key;
  }

  /**
   * Maps project database league code to The Odds API sport key
   */
  private getSportKey(league: string): string {
    const map: Record<string, string> = {
      "WC": "soccer_fifa_world_cup",
      "E0": "soccer_epl",
      "D1": "soccer_germany_bundesliga",
      "SP1": "soccer_spain_la_liga",
      "I1": "soccer_italy_serie_a",
      "F1": "soccer_france_ligue_one",
    };
    return map[league.toUpperCase()] || "soccer";
  }

  /**
   * Fuzzy matches team names
   */
  private isTeamMatch(dbName: string, apiName: string): boolean {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cDb = clean(dbName);
    const cApi = clean(apiName);

    const aliases: Record<string, string[]> = {
      "czechia": ["czech republic", "czech"],
      "south korea": ["korea republic", "korea"],
      "united states": ["usa", "us", "united states of america"],
      "bosnia-herzegovina": ["bosnia and herzegovina", "bosnia & herzegovina", "bosnia"],
      "ivory coast": ["cote d'ivoire", "cote divoire"],
      "m'gladbach": ["monchengladbach", "borussia monchengladbach"],
      "ein frankfurt": ["eintracht frankfurt", "frankfurt"],
      "leverkusen": ["bayer leverkusen"],
    };

    if (cDb === cApi) return true;
    if (cDb.includes(cApi) || cApi.includes(cDb)) return true;

    const dbAliases = aliases[cDb] || [];
    for (const alias of dbAliases) {
      const cAlias = clean(alias);
      if (cAlias === cApi || cApi.includes(cAlias) || cAlias.includes(cApi)) return true;
    }
    return false;
  }

  /**
   * Fetches real odds for a match by calling the sport endpoint and matching by teams
   */
  async fetchOddsForMatch(
    league: string,
    homeTeam: string,
    awayTeam: string
  ): Promise<any[]> {
    const sport = this.getSportKey(league);
    // Fetch h2h, spreads, and totals from Pinnacle (preferred) and Bet365
    const url = `${this.baseUrl}/${sport}/odds/?apiKey=${this.apiKey}&regions=eu&markets=h2h,spreads,totals&bookmakers=pinnacle,bet365`;

    console.log(`[TheOddsAPI] Fetching odds for sport: ${sport}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`The Odds API request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as TheOddsApiMatchResponse[];
    if (!Array.isArray(data)) return [];

    // Find matching game
    const match = data.find(
      (m) =>
        (this.isTeamMatch(homeTeam, m.home_team) && this.isTeamMatch(awayTeam, m.away_team)) ||
        (this.isTeamMatch(homeTeam, m.away_team) && this.isTeamMatch(awayTeam, m.home_team))
    );

    if (!match) {
      console.log(`[TheOddsAPI] No matching fixture found for: ${homeTeam} vs ${awayTeam}`);
      return [];
    }

    console.log(`[TheOddsAPI] Found match: ${match.home_team} vs ${match.away_team}`);

    // Choose Pinnacle first, otherwise Bet365
    const bookmaker =
      match.bookmakers.find((b) => b.key === "pinnacle") ||
      match.bookmakers.find((b) => b.key === "bet365") ||
      match.bookmakers[0];

    if (!bookmaker) {
      console.log(`[TheOddsAPI] No suitable bookmaker found for matched fixture.`);
      return [];
    }

    const oddsSnapshots: any[] = [];
    const now = new Date();

    for (const market of bookmaker.markets) {
      if (market.key === "h2h") {
        for (const outcome of market.outcomes) {
          let selection = "";
          if (this.isTeamMatch(homeTeam, outcome.name)) selection = "Home";
          else if (outcome.name === "Draw") selection = "Draw";
          else if (this.isTeamMatch(awayTeam, outcome.name)) selection = "Away";

          if (selection) {
            // Match Winner key
            oddsSnapshots.push({
              book: bookmaker.key,
              market: "Match Winner",
              selection: selection,
              price: outcome.price,
              takenAt: now,
            });
            // Standard 1x2 key for backward compatibility
            oddsSnapshots.push({
              book: bookmaker.key,
              market: "1x2",
              selection: selection.toLowerCase(),
              price: outcome.price,
              takenAt: now,
            });
          }
        }
      } else if (market.key === "spreads") {
        for (const outcome of market.outcomes) {
          let selectionPrefix = "";
          if (this.isTeamMatch(homeTeam, outcome.name)) selectionPrefix = "Home";
          else if (this.isTeamMatch(awayTeam, outcome.name)) selectionPrefix = "Away";

          if (selectionPrefix && outcome.point !== undefined) {
            const sign = outcome.point >= 0 ? "+" : "";
            oddsSnapshots.push({
              book: bookmaker.key,
              market: "Asian Handicap",
              selection: `${selectionPrefix} ${sign}${outcome.point}`,
              price: outcome.price,
              takenAt: now,
            });
          }
        }
      } else if (market.key === "totals") {
        for (const outcome of market.outcomes) {
          if ((outcome.name === "Over" || outcome.name === "Under") && outcome.point !== undefined) {
            oddsSnapshots.push({
              book: bookmaker.key,
              market: "Goals Over/Under",
              selection: `${outcome.name} ${outcome.point}`,
              price: outcome.price,
              takenAt: now,
            });
          }
        }
      }
    }

    return oddsSnapshots;
  }
}
