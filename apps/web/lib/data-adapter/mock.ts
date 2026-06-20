import { DataAdapter, AdapterFixture, AdapterResult, AdapterClosingOdds } from "./types";

export class MockAdapter implements DataAdapter {
  async getUpcomingFixtures(leagues: string[], hoursAhead: number): Promise<AdapterFixture[]> {
    const now = new Date();
    const fixtures: AdapterFixture[] = [
      {
        id: "mock_pl_mun_ars",
        league: "PL",
        home: "Manchester United",
        away: "Arsenal",
        kickoffUtc: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2小时后开赛
        status: "scheduled",
        odds: {
          home: 2.50,
          draw: 3.40,
          away: 2.80,
          bookmaker: "pinnacle",
          takenAt: now.toISOString(),
        }
      },
      {
        id: "mock_pl_che_liv",
        league: "PL",
        home: "Chelsea",
        away: "Liverpool",
        kickoffUtc: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(), // 5小时后开赛
        status: "scheduled",
        odds: {
          home: 3.10,
          draw: 3.50,
          away: 2.25,
          bookmaker: "pinnacle",
          takenAt: now.toISOString(),
        }
      }
    ];

    // 如果请求了 WC 世界杯，则加入世界杯 Mock 焦点赛
    if (leagues.includes("WC")) {
      fixtures.push({
        id: "mock_wc_bra_ger",
        league: "WC",
        home: "Brazil",
        away: "Germany",
        kickoffUtc: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(), // 1小时后开赛
        status: "scheduled",
        odds: {
          home: 2.10,
          draw: 3.40,
          away: 3.20,
          bookmaker: "pinnacle",
          takenAt: now.toISOString(),
        }
      });
    }

    return fixtures;
  }

  async getFixtureResults(leagues: string[], dateFrom: Date, dateTo: Date): Promise<AdapterResult[]> {
    return [
      {
        id: "mock_pl_mun_ars",
        homeGoals: 2,
        awayGoals: 1,
        status: "finished"
      },
      {
        id: "mock_pl_che_liv",
        homeGoals: 1,
        awayGoals: 3,
        status: "finished"
      },
      {
        id: "mock_wc_bra_ger",
        homeGoals: 1,
        awayGoals: 7,
        status: "finished"
      }
    ];
  }

  async getClosingOdds(fixtureId: string): Promise<AdapterClosingOdds | null> {
    if (fixtureId === "mock_pl_mun_ars") {
      return {
        fixtureId: "mock_pl_mun_ars",
        homeFairProb: 0.42, // ~2.38 去抽水公平赔率 (投注赔率 2.50 跑赢了收盘公平赔率，CLV 值为正)
        drawFairProb: 0.28,
        awayFairProb: 0.30,
        closingOdds: {
          home: 2.30,
          draw: 3.30,
          away: 2.70
        }
      };
    }
    if (fixtureId === "mock_pl_che_liv") {
      return {
        fixtureId: "mock_pl_che_liv",
        homeFairProb: 0.30,
        drawFairProb: 0.27,
        awayFairProb: 0.43,
        closingOdds: {
          home: 3.00,
          draw: 3.40,
          away: 2.15
        }
      };
    }
    if (fixtureId === "mock_wc_bra_ger") {
      return {
        fixtureId: "mock_wc_bra_ger",
        homeFairProb: 0.45,
        drawFairProb: 0.28,
        awayFairProb: 0.27,
        closingOdds: {
          home: 2.05,
          draw: 3.30,
          away: 3.10
        }
      };
    }
    return null;
  }
}

