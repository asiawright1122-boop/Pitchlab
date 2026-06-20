#!/usr/bin/env bash
# Export Phase 2 league monitoring from cached football-data.co.uk CSVs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="$ROOT/engine/.venv/bin/pitchlab"
DATA="$ROOT/apps/web/public/data"
SEASONS="${SEASONS:-2021 2022 2023 2024}"

if [[ ! -x "$ENGINE" ]]; then
  echo "error: $ENGINE not found" >&2
  exit 1
fi

echo "[export-leagues] football-data source, seasons: $SEASONS"
cd "$ROOT/engine"
"$ENGINE" league export --all --seasons $SEASONS \
  --source football-data \
  --export-json "$DATA" \
  --holdout "${HOLDOUT:-30}"

echo "[export-leagues] done -> $DATA/league_bundle.json"
