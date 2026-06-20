#!/usr/bin/env bash
# Fetch World Cup fixtures from football-data.org → fixtures.json → optional DB sync.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ -z "${FOOTBALL_DATA_TOKEN:-}" ]]; then
  echo "[fixtures:live] FOOTBALL_DATA_TOKEN not set — get a free token at https://www.football-data.org/"
  exit 1
fi

DATA_DIR="${DATA_DIR:-$ROOT/apps/web/public/data}"
ENGINE="$ROOT/engine/.venv/bin/pitchlab"

if [[ ! -x "$ENGINE" ]]; then
  echo "[fixtures:live] engine venv missing — run: cd engine && python -m venv .venv && pip install -e ."
  exit 1
fi

echo "[fixtures:live] fetching football-data.org → $DATA_DIR/fixtures.json"
(cd "$ROOT/engine" && "$ENGINE" fixtures --live --export-json "$DATA_DIR/fixtures.json")

if [[ -n "${DATABASE_URL:-}" ]]; then
  npm run db:sync
  # 自动同步真实波胆及其他未同步的完整真实盘口
  npm run db:sync:correct-scores || echo "[fixtures:live] correct scores sync skipped/failed"
  echo "[fixtures:live] synced to Postgres"
else
  echo "[fixtures:live] DATABASE_URL unset — JSON only (web static fallback)"
fi

echo "[fixtures:live] done — open /matches"
