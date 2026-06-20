export interface AdapterFixture {
  id: string; // 统一后的唯一 fixture_id
  league: string;
  home: string;
  away: string;
  kickoffUtc: string; // ISO 格式字符串
  status: string; // scheduled | finished | postponed
  odds?: {
    home: number;
    draw: number;
    away: number;
    bookmaker: string;
    takenAt: string; // ISO 格式字符串
  };
}

export interface AdapterResult {
  id: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "scheduled" | "finished" | "postponed";
}

export interface AdapterClosingOdds {
  fixtureId: string;
  homeFairProb: number; // 终场去抽水后的公平概率 (0 ~ 1)
  drawFairProb: number;
  awayFairProb: number;
  closingOdds: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface DataAdapter {
  /** 获取未来指定小时内的赛程及最新的赛前盘口赔率 */
  getUpcomingFixtures(leagues: string[], hoursAhead: number): Promise<AdapterFixture[]>;

  /** 获取特定时间范围内的赛果用于投注结算 */
  getFixtureResults(leagues: string[], dateFrom: Date, dateTo: Date): Promise<AdapterResult[]>;

  /** 获取特定场次完赛时的 Pinnacle 收盘公平盘口（用于 CLV 眼光核算） */
  getClosingOdds(fixtureId: string): Promise<AdapterClosingOdds | null>;
}
