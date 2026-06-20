import { DataAdapter, AdapterFixture, AdapterResult, AdapterClosingOdds } from "./types";
import { MockAdapter } from "./mock";
import { OddsApiAdapter } from "./odds-api";
import { FootballDataOrgAdapter } from "./football-data";
import { DbDataAdapter } from "./db";

class LiveAdapter implements DataAdapter {
  private oddsAdapter: OddsApiAdapter;
  private resultsAdapter: FootballDataOrgAdapter;

  constructor() {
    this.oddsAdapter = new OddsApiAdapter();
    this.resultsAdapter = new FootballDataOrgAdapter();
  }

  async getUpcomingFixtures(leagues: string[], hoursAhead: number): Promise<AdapterFixture[]> {
    return this.oddsAdapter.getUpcomingFixtures(leagues, hoursAhead);
  }

  async getFixtureResults(leagues: string[], dateFrom: Date, dateTo: Date): Promise<AdapterResult[]> {
    return this.resultsAdapter.getFixtureResults(leagues, dateFrom, dateTo);
  }

  async getClosingOdds(fixtureId: string): Promise<AdapterClosingOdds | null> {
    // Pinnacle 终场公平赔率属于高级结算，需要 Pinnacle 历史收盘盘口数据（由 worker 定时下载免费 CSV 完成）
    return null;
  }
}

export function getDataAdapter(): DataAdapter {
  const type = (process.env.DATA_SOURCE_TYPE || "db").toLowerCase();
  
  switch (type) {
    case "live":
      return new LiveAdapter();
    case "db":
      return new DbDataAdapter();
    case "mock":
      if (process.env.ALLOW_MOCK === "true") {
        return new MockAdapter();
      }
      console.warn("[factory] MockAdapter is disabled globally. Falling back to DbDataAdapter.");
      return new DbDataAdapter();
    default:
      return new DbDataAdapter();
  }
}

