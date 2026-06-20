#!/usr/bin/env bash
# Register Telegram webhook → NEXT_PUBLIC_SITE_URL/api/telegram/webhook
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

TOKEN="${TELEGRAM_BOT_TOKEN:-}"
BASE="${NEXT_PUBLIC_SITE_URL:-}"
SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"

if [[ -z "$TOKEN" ]]; then
  echo "TELEGRAM_BOT_TOKEN required"
  exit 1
fi
if [[ -z "$BASE" ]]; then
  echo "NEXT_PUBLIC_SITE_URL required (e.g. https://your-domain.com)"
  exit 1
fi

URL="${BASE%/}/api/telegram/webhook"
PAYLOAD="{\"url\":\"$URL\",\"allowed_updates\":[\"message\"]}"
if [[ -n "$SECRET" ]]; then
  PAYLOAD="{\"url\":\"$URL\",\"secret_token\":\"$SECRET\",\"allowed_updates\":[\"message\"]}"
fi

echo "[telegram-webhook] setWebhook → $URL"
curl -sS -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | python3 -m json.tool
