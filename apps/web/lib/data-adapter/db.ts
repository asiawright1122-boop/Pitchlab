import { prisma } from "../prisma";
import { DataAdapter, AdapterFixture, AdapterResult, AdapterClosingOdds } from "./types";

function mapStatus(apiStatus: string): "scheduled" | "finished" | "postponed" {
  const finishedStatuses = ["FT", "AET", "PEN"];
  const postponedStatuses = ["PST", "CAN", "ABD"];
  
  if (finishedStatuses.includes(apiStatus)) {
    return "finished";
  }
  if (postponedStatuses.includes(apiStatus)) {
    return "postponed";
  }
  return "scheduled";
}

export class DbDataAdapter implements DataAdapter {
  async getUpcomingFixtures(leagues: string[], hoursAhead: number): Promise<AdapterFixture[]> {
    const now = new Date();
    const limitDate = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    // 双向支持：如果传入 "PL" 简写，则同时查找数据库中的 "PL" 或是 "39" (API-Football)
    const dbLeagues: string[] = [];
    const leagueMapping: Record<string, string> = {
      "PL": "39",
      "PD": "140",
      "BL1": "78",
      "SA": "135",
      "FL1": "61",
      "WC": "1",
    };

    for (const lg of leagues) {
      dbLeagues.push(lg);
      if (leagueMapping[lg]) {
        dbLeagues.push(leagueMapping[lg]);
      }
    }

    const fixtures = await prisma.fixture.findMany({
      where: {
        kickoffUtc: {
          gte: now,
          lte: limitDate,
        },
        league: {
          in: dbLeagues,
        },
      },
      include: {
        oddsSnapshots: true,
      },
    });

    return fixtures.map((f) => {
      const getLatestSelectionOdds = (selection: string) => {
        const sorted = f.oddsSnapshots
          .filter((o) => o.selection === selection)
          .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
        const pin = sorted.find((o) => o.book.toLowerCase() === "pinnacle");
        return pin || sorted[0];
      };

      const homeOdds = getLatestSelectionOdds("home");
      const drawOdds = getLatestSelectionOdds("draw");
      const awayOdds = getLatestSelectionOdds("away");

      let oddsInfo;
      if (homeOdds && drawOdds && awayOdds) {
        oddsInfo = {
          home: homeOdds.price,
          draw: drawOdds.price,
          away: awayOdds.price,
          bookmaker: homeOdds.book,
          takenAt: homeOdds.takenAt.toISOString(),
        };
      }

      // 将 league 名字转换回简写以便前端和 Bot 匹配
      let displayLeague = f.league;
      const reverseMapping: Record<string, string> = {
        "39": "PL",
        "140": "PD",
        "78": "BL1",
        "135": "SA",
        "61": "FL1",
        "1": "WC",
      };
      if (reverseMapping[f.league]) {
        displayLeague = reverseMapping[f.league];
      }

      return {
        id: f.id,
        league: displayLeague,
        home: f.home,
        away: f.away,
        kickoffUtc: f.kickoffUtc.toISOString(),
        status: mapStatus(f.status),
        odds: oddsInfo,
      };
    });
  }

  async getFixtureResults(leagues: string[], dateFrom: Date, dateTo: Date): Promise<AdapterResult[]> {
    const dbLeagues: string[] = [];
    const leagueMapping: Record<string, string> = {
      "PL": "39",
      "PD": "140",
      "BL1": "78",
      "SA": "135",
      "FL1": "61",
      "WC": "1",
    };

    for (const lg of leagues) {
      dbLeagues.push(lg);
      if (leagueMapping[lg]) {
        dbLeagues.push(leagueMapping[lg]);
      }
    }

    const fixtures = await prisma.fixture.findMany({
      where: {
        kickoffUtc: {
          gte: dateFrom,
          lte: dateTo,
        },
        league: {
          in: dbLeagues,
        },
      },
    });

    return fixtures.map((f) => {
      return {
        id: f.id,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        status: mapStatus(f.status),
      };
    });
  }

  async getClosingOdds(fixtureId: string): Promise<AdapterClosingOdds | null> {
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        oddsSnapshots: true,
      },
    });

    if (!fixture || fixture.oddsSnapshots.length === 0) {
      return null;
    }

    const getLatestSelectionOdds = (selection: string) => {
      const sorted = fixture.oddsSnapshots
        .filter((o) => o.selection === selection)
        .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
      const pin = sorted.find((o) => o.book.toLowerCase() === "pinnacle");
      return pin || sorted[0];
    };

    const homeOdds = getLatestSelectionOdds("home");
    const drawOdds = getLatestSelectionOdds("draw");
    const awayOdds = getLatestSelectionOdds("away");

    if (!homeOdds || !drawOdds || !awayOdds) {
      return null;
    }

    const h = homeOdds.price;
    const d = drawOdds.price;
    const a = awayOdds.price;

    const sum = (1 / h) + (1 / d) + (1 / a);
    const homeFairProb = (1 / h) / sum;
    const drawFairProb = (1 / d) / sum;
    const awayFairProb = (1 / a) / sum;

    return {
      fixtureId,
      homeFairProb,
      drawFairProb,
      awayFairProb,
      closingOdds: {
        home: h,
        draw: d,
        away: a,
      },
    };
  }
}
