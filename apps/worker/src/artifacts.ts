import fs from "node:fs";
import path from "node:path";

/** Keys match PublishedArtifact.key and apps/web API routes. */
export const ARTIFACT_FILES: Record<string, string> = {
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

export function resolveDataDir(): string {
  const fromEnv = process.env.DATA_DIR;
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(import.meta.dirname, "../../web/public/data");
}

export function readArtifactFile(dataDir: string, key: string): unknown | null {
  const filename = ARTIFACT_FILES[key];
  if (!filename) return null;
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

export function extractGeneratedAt(key: string, payload: unknown): Date | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const raw = p.generated_at ?? (key === "backtest" ? null : null);
  if (typeof raw !== "string") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function inferSource(key: string, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.source === "string") return p.source;
  if (key === "meta" && typeof p.name === "string") return p.name;
  return `json:${key}`;
}
