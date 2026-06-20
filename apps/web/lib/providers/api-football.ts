export interface ApiFootballFixtureResponse {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
    }
  };
  league: {
    id: number;
    name: string;
  };
  teams: {
    home: { name: string; winner: boolean | null };
    away: { name: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface ApiFootballOddsResponse {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
  };
  league: {
    id: number;
    name: string;
  };
  bookmakers: {
    id: number;
    name: string;
    bets: {
      id: number;
      name: string;
      values: {
        value: string;
        odd: string;
      }[];
    }[];
  }[];
}

export class ApiFootballProvider {
  private apiKey: string;
  private baseUrl = "https://v3.football.api-sports.io";

  constructor() {
    const key = process.env.API_FOOTBALL_KEY;
    if (!key) {
      throw new Error("API_FOOTBALL_KEY is missing in environment variables.");
    }
    this.apiKey = key;
  }

  /**
   * Fetches fixtures for a specific date.
   */
  async fetchFixturesByDate(date: string): Promise<ApiFootballFixtureResponse[]> {
    const url = `${this.baseUrl}/fixtures?date=${date}`;
    
    console.log(`[API-Football] Fetching fixtures for date: ${date}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": this.apiKey,
      },
      next: { revalidate: 600 } 
    });

    if (!response.ok) {
      throw new Error(`API-Football request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error("[API-Football] API Error:", data.errors);
      throw new Error("API-Football returned errors.");
    }

    return data.response as ApiFootballFixtureResponse[];
  }

  /**
   * Fetches pre-match odds for a specific date.
   * By default, bookmaker 17 is Pinnacle. 
   */
  async fetchOddsByDate(date: string, bookmaker: number = 17): Promise<ApiFootballOddsResponse[]> {
    const url = `${this.baseUrl}/odds?date=${date}&bookmaker=${bookmaker}`;
    
    console.log(`[API-Football] Fetching odds for date: ${date}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": this.apiKey,
      },
      next: { revalidate: 600 } 
    });

    if (!response.ok) {
      throw new Error(`API-Football request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error("[API-Football] API Error:", data.errors);
      throw new Error("API-Football returned errors.");
    }

    return data.response as ApiFootballOddsResponse[];
  }

  /**
   * Fetches pre-match odds for a specific fixture ID.
   * By default, bookmaker 17 is Pinnacle.
   */
  async fetchOddsByFixture(fixtureId: string, bookmaker: number = 17): Promise<ApiFootballOddsResponse[]> {
    const url = `${this.baseUrl}/odds?fixture=${fixtureId}&bookmaker=${bookmaker}`;
    
    console.log(`[API-Football] Fetching odds for fixture: ${fixtureId}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": this.apiKey,
      },
      next: { revalidate: 600 } 
    });

    if (!response.ok) {
      throw new Error(`API-Football request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error("[API-Football] API Error:", data.errors);
      throw new Error("API-Football returned errors.");
    }

    return data.response as ApiFootballOddsResponse[];
  }

  /**
   * Fetches lineups for a specific fixture ID.
   */
  async fetchLineupsByFixture(fixtureId: string): Promise<any[]> {
    const url = `${this.baseUrl}/fixtures/lineups?fixture=${fixtureId}`;
    console.log(`[API-Football] Fetching lineups for fixture: ${fixtureId}`);
    const response = await fetch(url, {
      method: "GET",
      headers: { "x-apisports-key": this.apiKey },
      next: { revalidate: 600 }
    });
    if (!response.ok) throw new Error(`API-Football request failed: ${response.statusText}`);
    const data = await response.json();
    if (data.errors && Object.keys(data.errors).length > 0) throw new Error("API-Football returned errors.");
    return data.response || [];
  }

  /**
   * Fetches match stats for a specific fixture ID.
   */
  async fetchStatsByFixture(fixtureId: string): Promise<any[]> {
    const url = `${this.baseUrl}/fixtures/statistics?fixture=${fixtureId}`;
    console.log(`[API-Football] Fetching stats for fixture: ${fixtureId}`);
    const response = await fetch(url, {
      method: "GET",
      headers: { "x-apisports-key": this.apiKey },
      next: { revalidate: 300 }
    });
    if (!response.ok) throw new Error(`API-Football request failed: ${response.statusText}`);
    const data = await response.json();
    if (data.errors && Object.keys(data.errors).length > 0) throw new Error("API-Football returned errors.");
    return data.response || [];
  }

  /**
   * Fetches match events for a specific fixture ID.
   */
  async fetchEventsByFixture(fixtureId: string): Promise<any[]> {
    const url = `${this.baseUrl}/fixtures/events?fixture=${fixtureId}`;
    console.log(`[API-Football] Fetching events for fixture: ${fixtureId}`);
    const response = await fetch(url, {
      method: "GET",
      headers: { "x-apisports-key": this.apiKey },
      next: { revalidate: 120 }
    });
    if (!response.ok) throw new Error(`API-Football request failed: ${response.statusText}`);
    const data = await response.json();
    if (data.errors && Object.keys(data.errors).length > 0) throw new Error("API-Football returned errors.");
    return data.response || [];
  }
}
