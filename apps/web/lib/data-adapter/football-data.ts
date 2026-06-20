import { DataAdapter, AdapterFixture, AdapterResult, AdapterClosingOdds } from "./types";

export class FootballDataOrgAdapter implements DataAdapter {
  private token: string;

  constructor() {
    this.token = process.env.FOOTBALL_DATA_TOKEN || "";
  }

  async getUpcomingFixtures(leagues: string[], hoursAhead: number): Promise<AdapterFixture[]> {
    // football-data.org 仅用于赛果比分结算，赔率与近期赛程拉取由 OddsApiAdapter 承载
    return [];
  }

  async getFixtureResults(leagues: string[], dateFrom: Date, dateTo: Date): Promise<AdapterResult[]> {
    if (!this.token) {
      console.warn("[FootballDataOrgAdapter] FOOTBALL_DATA_TOKEN is unset. Returning empty results.");
      return [];
    }

    const fmtDate = (d: Date) => d.toISOString().split("T")[0];
    const comps = leagues.join(",");

    try {
      const url = `https://api.football-data.org/v4/matches?dateFrom=${fmtDate(dateFrom)}&dateTo=${fmtDate(dateTo)}&competitions=${comps}`;
      const res = await fetch(url, {
        headers: { "X-Auth-Token": this.token },
      });

      if (!res.ok) {
        console.error("[FootballDataOrgAdapter] Failed to fetch matches:", await res.text());
        return [];
      }

      const data = (await res.json()) as {
        matches: Array<{
          id: number;
          status: string;
          score: {
            fullTime: {
              home: number | null;
              away: number | null;
            };
          };
        }>;
      };

      return (data.matches ?? []).map((m) => {
        let status: AdapterResult["status"] = "scheduled";
        if (m.status === "FINISHED") {
          status = "finished";
        } else if (m.status === "POSTPONED" || m.status === "CANCELLED") {
          status = "postponed";
        }

        return {
          id: String(m.id),
          homeGoals: m.score.fullTime.home,
          awayGoals: m.score.fullTime.away,
          status,
        };
      });
    } catch (err) {
      console.error("[FootballDataOrgAdapter] Error fetching matches from football-data.org:", err);
      return [];
    }
  }

  async getClosingOdds(fixtureId: string): Promise<AdapterClosingOdds | null> {
    return null;
  }
}
