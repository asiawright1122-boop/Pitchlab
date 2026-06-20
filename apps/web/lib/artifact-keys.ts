/** Published artifact keys (must match worker ARTIFACT_FILES). */
export const ARTIFACT_KEYS = [
  "meta",
  "title_odds",
  "predictions",
  "backtest",
  "leagues",
  "value",
  "status",
  "fixtures",
  "league_elo",
  "league_predictions",
  "metrics_monitor",
  "league_bundle",
  "feedback_snapshot",
  "metrics_history",
  "settlements",
  "shadow_models",
  "weekly_digest",
] as const;

export type ArtifactKey = (typeof ARTIFACT_KEYS)[number];

export function isArtifactKey(key: string): key is ArtifactKey {
  return (ARTIFACT_KEYS as readonly string[]).includes(key);
}

export const ARTIFACT_FILENAMES: Record<ArtifactKey, string> = {
  meta: "meta.json",
  title_odds: "title_odds.json",
  predictions: "predictions.json",
  backtest: "backtest.json",
  leagues: "leagues.json",
  value: "value.json",
  status: "status.json",
  fixtures: "fixtures.json",
  league_elo: "league_elo.json",
  league_predictions: "league_predictions.json",
  metrics_monitor: "metrics_monitor.json",
  league_bundle: "league_bundle.json",
  feedback_snapshot: "feedback_snapshot.json",
  metrics_history: "metrics_history.json",
  settlements: "settlements.json",
  shadow_models: "shadow_models.json",
  weekly_digest: "weekly_digest.json",
};

export function staticArtifactPath(key: ArtifactKey): string {
  return `/data/${ARTIFACT_FILENAMES[key]}`;
}
