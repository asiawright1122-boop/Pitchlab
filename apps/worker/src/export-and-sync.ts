/**
 * Optional: run engine CLI exports then sync to DB.
 * Requires Python venv at engine/.venv and DATABASE_URL.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const engineDir = path.join(root, "engine");
const dataDir = path.join(root, "apps/web/public/data");
const pitchlab = path.join(engineDir, ".venv/bin/pitchlab");

function runPitchlab(args: string[]) {
  const r = spawnSync(pitchlab, args, { cwd: engineDir, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function main() {
  console.log("[pitchlab-worker] exporting engine JSON...");
  runPitchlab(["worldcup", "--export-json", dataDir, "--sims", "10000"]);
  runPitchlab([
    "backtest",
    "--source",
    process.env.BACKTEST_SOURCE || "football-data",
    "--export-json",
    path.join(dataDir, "backtest.json"),
  ]);

  console.log("[pitchlab-worker] syncing to database...");
  await import("./sync.js");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
