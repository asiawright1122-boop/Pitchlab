export interface Meta {
  name: string;
  illustrative: boolean;
  generated_at: string;
  n_sims: number;
  model: string;
  disclaimer: string;
}

export interface TitleRow {
  team: string;
  advance: number;
  r16: number;
  qf: number;
  sf: number;
  final: number;
  champion: number;
}

export interface PredictionRow {
  group: string;
  matchday: number;
  home: string;
  away: string;
  home_prob: number;
  draw_prob: number;
  away_prob: number;
  over25: number;
}

export interface TrackRecord {
  source: string;
  n_predicted: number;
  n_bets: number;
  avg_clv: number | null;
  roi: number | null;
  kelly_growth: number | null;
  brier: number;
  calibration: Calibration;
  verdict: string;
  clv_curve: number[];
}

export interface ReliabilityBin {
  p_mean: number;
  freq: number;
  count: number;
}

export interface Calibration {
  ece: number;
  log_loss: number;
  bins: ReliabilityBin[];
}

export interface LeagueRow {
  code: string;
  name: string;
  n_matches: number;
  n_predicted: number;
  n_bets: number;
  avg_clv: number | null;
  roi: number | null;
  kelly_growth: number | null;
  brier: number;
  ece: number;
  verdict: string;
}

export interface LeaguesData {
  generated_at: string;
  seasons: number[];
  config: {
    min_train: number;
    refit_every: number;
    edge_threshold: number;
    calibrate: boolean;
  };
  leagues: LeagueRow[];
  summary_verdict: string;
}

export interface ValueBet {
  selection: "home" | "draw" | "away";
  odds: number;
  model_prob: number;
  fair_prob: number;
  edge: number;
  ev: number;
}

export interface ValueFixture {
  home: string;
  away: string;
  commence: string;
  book: string;
  model: { home: number; draw: number; away: number };
  odds: { home: number; draw: number; away: number };
  fair: { home: number; draw: number; away: number };
  value_bets: ValueBet[];
  best: ValueBet | null;
}

export interface ValueData {
  illustrative: boolean;
  source: string;
  sport: string;
  generated_at: string;
  min_edge: number;
  n_fixtures: number;
  n_value_bets: number;
  disclaimer: string;
  fixtures: ValueFixture[];
}

export interface TaskStatus {
  task: string;
  status: string;
  ms: number;
}

export interface SystemStatus {
  pipeline: string;
  run_id: string;
  ok: boolean;
  generated_at: string;
  tasks: TaskStatus[];
}

export interface OddsSnapshotRecord {
  id: string;
  fixtureId: string;
  book: string;
  market: string;
  selection: string;
  price: number;
  takenAt: string;
}

export interface FixtureRecord {
  id: string;
  league: string;
  home: string;
  away: string;
  group?: string | null;
  matchday?: number | null;
  kickoff_utc?: string | null;
  stage?: string | null;
  status: string;
  home_goals?: number | null;
  away_goals?: number | null;
  home_prob?: number | null;
  draw_prob?: number | null;
  away_prob?: number | null;
  over25?: number | null;
  odds_snapshots?: OddsSnapshotRecord[];
}

export interface FixturesData {
  generated_at: string;
  source: string;
  competition: string;
  illustrative: boolean;
  fixtures: FixtureRecord[];
}

export interface LeagueEloRow {
  team: string;
  elo: number;
}

export interface LeagueEloData {
  generated_at: string;
  league: string;
  league_name: string;
  seasons: number[];
  teams: LeagueEloRow[];
}

export interface LeaguePrediction {
  date: string;
  home: string;
  away: string;
  home_prob: number;
  draw_prob: number;
  away_prob: number;
  actual: string | null;
  value_selection: string | null;
  kelly_frac: number | null;
}

export interface LeaguePredictionsData {
  generated_at: string;
  league: string;
  league_name: string;
  holdout: number;
  disclaimer: string;
  predictions: LeaguePrediction[];
}

export interface LeagueBundleEntry {
  code: string;
  name: string;
  monitor?: MetricsMonitorData["monitor"];
  error?: string;
}

export interface FeedbackSnapshot {
  generated_at: string;
  agent?: { pipeline?: string; ok?: boolean; run_id?: string };
  backtest_summary?: {
    source?: string;
    avg_clv?: number | null;
    roi?: number | null;
    brier?: number;
    n_bets?: number;
    verdict?: string;
  };
  champion_challenger?: {
    champion?: { label: string; metric: string; value?: number | null };
    challenger?: { label: string; metric: string; value?: number | null; league?: string };
    note?: string;
  };
  summary_verdict?: string;
}

export interface LeagueBundleData {
  generated_at: string;
  seasons: number[];
  leagues: LeagueBundleEntry[];
}

export interface WeeklyDigest {
  generated_at: string;
  week_ending: string;
  title: string;
  headline: string;
  sections: {
    id: string;
    title: string;
    bullets?: string[];
    metrics?: Record<string, number | null | undefined>;
    rows?: { code?: string; avg_clv?: number | null; brier?: number | null }[];
    champion?: { label?: string; metric?: string; value?: number | null };
    challenger?: { label?: string; metric?: string; value?: number | null };
    note?: string;
  }[];
  body_markdown: string;
  share_paths?: { record?: string; weekly?: string };
}

export interface MetricsMonitorData {
  generated_at: string;
  league: string;
  monitor: {
    n_holdout: number;
    n_scored: number;
    brier: number | null;
    brier_raw?: number | null;
    calibrated?: boolean;
    ece: number | null;
    log_loss: number | null;
  };
  model: string;
  strategy: string;
}
