import { DataAdapter, AdapterFixture, AdapterResult, AdapterClosingOdds } from "./types";

const LEAGUE_MAPPING: Record<string, string> = {
  "PL": "soccer_epl",                  // 英超
  "PD": "soccer_spain_la_liga",       // 西甲
  "BL1": "soccer_germany_bundesliga",   // 德甲
  "SA": "soccer_italy_serie_a",       // 意甲
  "FL1": "soccer_france_ligue1",      // 法甲
  "WC": "soccer_fifa_world_cup",       // 世界杯
};


export class OddsApiAdapter implements DataAdapter {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.THE_ODDS_API_KEY || "";
  }

  async getUpcomingFixtures(leagues: string[], hoursAhead: number): Promise<AdapterFixture[]> {
    if (!this.apiKey) {
      console.warn("[OddsApiAdapter] THE_ODDS_API_KEY is unset. Returning empty fixtures.");
      return [];
    }

    const results: AdapterFixture[] = [];
    const now = new Date();

    for (const sysLeague of leagues) {
      const apiSport = LEAGUE_MAPPING[sysLeague];
      if (!apiSport) continue;

      try {
        const url = `https://api.the-odds-api.com/v4/sports/${apiSport}/odds/?apiKey=${this.apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`[OddsApiAdapter] Failed to fetch odds for ${sysLeague}:`, await res.text());
          continue;
        }

        const data = (await res.json()) as Array<{
          id: string;
          commence_time: string;
          home_team: string;
          away_team: string;
          bookmakers: Array<{
            key: string;
            last_update: string;
            markets: Array<{
              key: string;
              outcomes: Array<{ name: string; price: number }>;
            }>;
          }>;
        }>;

        for (const event of data) {
          const commence = new Date(event.commence_time);
          const diffHours = (commence.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (diffHours < 0 || diffHours > hoursAhead) continue;

          // 寻找 Pinnacle，找不到则用列表中的第一家博彩商进行兜底
          let bookmaker = event.bookmakers.find((b) => b.key === "pinnacle");
          if (!bookmaker && event.bookmakers.length > 0) {
            bookmaker = event.bookmakers[0];
          }

          let oddsInfo: AdapterFixture["odds"] | undefined;

          if (bookmaker) {
            const h2hMarket = bookmaker.markets.find((m) => m.key === "h2h");
            if (h2hMarket) {
              const homeOutcome = h2hMarket.outcomes.find((o) => o.name === event.home_team);
              const awayOutcome = h2hMarket.outcomes.find((o) => o.name === event.away_team);
              // outcomes 中的平局可能标为 "Draw" 或者是 "draw"
              const drawOutcome = h2hMarket.outcomes.find(
                (o) => o.name.toLowerCase() === "draw" || o.name.toLowerCase() === "tie"
              );

              if (homeOutcome && awayOutcome && drawOutcome) {
                oddsInfo = {
                  home: homeOutcome.price,
                  draw: drawOutcome.price,
                  away: awayOutcome.price,
                  bookmaker: bookmaker.key,
                  takenAt: bookmaker.last_update,
                };
              }
            }
          }

          results.push({
            id: event.id,
            league: sysLeague,
            home: event.home_team,
            away: event.away_team,
            kickoffUtc: event.commence_time,
            status: "scheduled",
            odds: oddsInfo,
          });
        }
      } catch (err) {
        console.error(`[OddsApiAdapter] Error fetching odds for ${sysLeague}:`, err);
      }
    }

    return results;
  }

  async getFixtureResults(leagues: string[], dateFrom: Date, dateTo: Date): Promise<AdapterResult[]> {
    return [];
  }

  async getClosingOdds(fixtureId: string): Promise<AdapterClosingOdds | null> {
    return null;
  }
}
