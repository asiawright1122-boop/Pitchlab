# Phase 4 ops — auth & entitlements

## Setup

```bash
npm run db:up
npm run db:migrate
npm run db:seed
```

Copy `SESSION_SECRET` from `.env.example` into repo root `.env` (and `apps/web/.env.local` if Next does not pick up root env).

## Dev login

1. Open http://localhost:3000/login
2. Enter any email; check **Dev: start as Pro** for full tabs
3. Value + League model tabs unlock via `entitlements` from `/api/auth/me`

## API

| Route | Method | Notes |
|-------|--------|-------|
| `/api/auth/login` | POST | `{ "email": "...", "plan": "pro" }` — `plan` only in dev |
| `/api/auth/logout` | POST | Clears session |
| `/api/auth/me` | GET | Current user + entitlements |
| `/api/channels/bind` | POST | Pro only; `{ "channel", "external_id" }` |

## Stripe (optional)

1. Create a recurring Price in Stripe Dashboard → copy `price_…` to `STRIPE_PRO_PRICE_ID`
2. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_SITE_URL`
3. Local webhooks: `stripe listen --forward-to localhost:3000/api/billing/webhook`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`
5. Sign in → `/pricing` → **Upgrade to Pro**

Webhook events handled: `checkout.session.completed` (→ pro), `customer.subscription.deleted` (→ free).

## Telegram bot

1. Create bot via @BotFather → `TELEGRAM_BOT_TOKEN` in `.env` (optional `TELEGRAM_BOT_USERNAME`)
2. **Local dev** (no public URL): `npm run telegram:poll` — long-polling bot
3. **Production**: set `NEXT_PUBLIC_SITE_URL` + optional `TELEGRAM_WEBHOOK_SECRET`, then:
   ```bash
   chmod +x scripts/telegram-webhook.sh
   ./scripts/telegram-webhook.sh
   ```
4. Pro user: Dashboard → **System** → **Connect Telegram** (deep link) or manual chat id from `/start`
5. After pipeline: `npm run notify` (also end of `scripts/pipeline.sh`) — Pro bindings only

| Route | Notes |
|-------|-------|
| `GET /api/channels/telegram-link` | Pro — one-tap `t.me/...?start=bind_…` URL |
| `POST /api/telegram/webhook` | Telegram updates (bind + /status) |
| `POST /api/channels/bind` | Manual `{ channel, external_id }` |

Without token, notify logs what would be sent.
