import { prisma } from "@/lib/prisma";
import { ApiFootballProvider } from "../providers/api-football";

export class SyncService {
  private apiFootball: ApiFootballProvider;

  constructor() {
    this.apiFootball = new ApiFootballProvider();
  }

  /**
   * Synchronize fixtures and odds for a specific date (YYYY-MM-DD).
   * Note: This requires two API-Football calls per date (1 for fixtures, 1 for odds).
   */
  async syncDate(date: string) {
    console.log(`[SyncService] Starting sync for date: ${date}`);
    
    // 1. Fetch Fixtures
    const fixturesData = await this.apiFootball.fetchFixturesByDate(date);
    console.log(`[SyncService] Fetched ${fixturesData.length} fixtures`);
    
    // 2. Fetch Odds (Pinnacle = 17)
    const oddsData = await this.apiFootball.fetchOddsByDate(date, 17);
    console.log(`[SyncService] Fetched ${oddsData.length} odds records`);

    // Create a map of odds for O(1) lookup
    const oddsMap = new Map();
    for (const oddItem of oddsData) {
      oddsMap.set(oddItem.fixture.id, oddItem);
    }

    let updatedFixtures = 0;
    let insertedOdds = 0;

    for (const item of fixturesData) {
      const fixtureId = String(item.fixture.id);
      const kickoffUtc = new Date(item.fixture.date);
      const homeTeam = item.teams.home.name;
      const awayTeam = item.teams.away.name;
      const league = String(item.league.id); // For now using ID, or item.league.name
      
      // Upsert Fixture
      await prisma.fixture.upsert({
        where: { id: fixtureId },
        update: {
          status: item.fixture.status.short,
          homeGoals: item.goals.home,
          awayGoals: item.goals.away,
          updatedAt: new Date()
        },
        create: {
          id: fixtureId,
          league: league,
          home: homeTeam,
          away: awayTeam,
          kickoffUtc: kickoffUtc,
          status: item.fixture.status.short,
          homeGoals: item.goals.home,
          awayGoals: item.goals.away
        }
      });
      updatedFixtures++;

      // Upsert Odds Snapshot
      const oddsInfo = oddsMap.get(item.fixture.id);
      if (oddsInfo && oddsInfo.bookmakers && oddsInfo.bookmakers.length > 0) {
        const bookmaker = oddsInfo.bookmakers[0];
        // Look for Match Winner (1x2) - id is usually 1
        const matchWinnerBet = bookmaker.bets.find((b: any) => b.id === 1 || b.name === "Match Winner");
        
        if (matchWinnerBet && matchWinnerBet.values) {
          const snapshotTakenAt = new Date(); // Ideally oddsInfo.fixture.timestamp but real-time is fine here
          
          for (const val of matchWinnerBet.values) {
            let selection = "";
            if (val.value === "Home") selection = "home";
            else if (val.value === "Draw") selection = "draw";
            else if (val.value === "Away") selection = "away";

            if (selection) {
              // Create an odds snapshot. (Not using upsert to keep a history stream, unless we only want the latest).
              // Wait, OddsSnapshot schema has @@unique([fixtureId, book, market, selection, takenAt])
              // We'll just insert it.
              await prisma.oddsSnapshot.create({
                data: {
                  fixtureId: fixtureId,
                  book: bookmaker.name,
                  market: "1x2",
                  selection: selection,
                  price: parseFloat(val.odd),
                  takenAt: snapshotTakenAt,
                }
              }).catch(() => {
                // Ignore duplicates if they happen in the exact same millisecond
              });
              insertedOdds++;
            }
          }
        }
      }
    }

    console.log(`[SyncService] Complete! Updated ${updatedFixtures} fixtures and recorded ${insertedOdds} odds values.`);
    return {
      date,
      fixtures: updatedFixtures,
      oddsRecords: insertedOdds
    };
  }
}
