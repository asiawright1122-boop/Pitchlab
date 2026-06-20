#!/usr/bin/env bash
# PitchLab daily pipeline: engine export → Postgres sync (Phase 1) → feedback (Phase 3).
# Cron example (06:00 UTC): 0 6 * * * cd /path/to/PitchLab && ./scripts/pipeline.sh >> logs/pipeline.log 2>&1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

DATA_DIR="${DATA_DIR:-$ROOT/apps/web/public/data}"
ENGINE_VENV="$ROOT/engine/.venv/bin/pitchlab"

echo "[pipeline] $(date -u +%Y-%m-%dT%H:%M:%SZ) start"

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[pipeline] pulling active model config from DB..."
  npm run db:pull-config || true
fi

if [[ -x "$ENGINE_VENV" ]]; then
  echo "[pipeline] engine export → $DATA_DIR"
  (cd "$ROOT/engine" && "$ENGINE_VENV" agent --pipeline worldcup \
    --out "$DATA_DIR" --sims "${SIMS:-10000}" --sync-web "$DATA_DIR")
  (cd "$ROOT/engine" && "$ENGINE_VENV" backtest --source "${BACKTEST_SOURCE:-football-data}" \
    --seasons ${LEAGUE_SEASONS:-2021 2022 2023 2024} \
    --export-json "$DATA_DIR/backtest.json")

  echo "[pipeline] running daily pipeline DAG (Phase 3 consolidated)"
  export DAILY_SEASONS="${LEAGUE_SEASONS:-2021 2022 2023 2024}"
  export DAILY_SOURCE="${LEAGUE_SOURCE:-football-data}"
  (cd "$ROOT/engine" && "$ENGINE_VENV" agent --pipeline daily --out "$DATA_DIR" --cache "$ROOT/engine/.cache")

  if [[ -n "${FOOTBALL_DATA_TOKEN:-}" ]]; then
    echo "[pipeline] live fixtures (football-data.org)"
    (cd "$ROOT/engine" && "$ENGINE_VENV" fixtures --live --export-json "$DATA_DIR/fixtures.json") || \
      echo "[pipeline] WARNING: live fixtures fetch failed (network issue?) — skipping"
  fi
else
  echo "[pipeline] skip engine export (no engine/.venv/bin/pitchlab)"
fi

if [[ -n "${DATABASE_URL:-}" ]] && command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  npm run db:sync
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
    echo "[pipeline] sending telegram notifications & alerts"
    npm run notify
    npm run alerts
  else
    echo "[pipeline] notify/alerts skipped (TELEGRAM_BOT_TOKEN unset)"
  fi
elif [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[pipeline] skip db:sync (DATABASE_URL unset) — web uses static JSON"
elif ! docker info >/dev/null 2>&1; then
  echo "[pipeline] skip db:sync (Docker not running)"
fi

echo "[pipeline] done"
