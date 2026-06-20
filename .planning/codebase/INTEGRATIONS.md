# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**Football Data Providers:**
- **football-data.co.uk**
  - Purpose: Download historical soccer match results, odds, and closing lines.
  - Method: HTTP GET downloads of static CSV files (e.g. `E0.csv`).
  - Cache: Stored locally in `.cache/` to minimize remote calls.
- **football-data.org**
  - Purpose: Real-time and upcoming fixture details.
  - Method: REST API calls.
  - Auth: API token stored in `FOOTBALL_DATA_TOKEN` env variable.

**Odds Providers:**
- **The Odds API**
  - Purpose: Retrieve live market odds (1X2, Asian handicap, etc.) from various bookmakers.
  - Method: REST API calls using `theoddsapi` python module.
  - Auth: API key stored in `THE_ODDS_API_KEY` env variable.

**Billing & Payment:**
- **Stripe**
  - Purpose: Customer subscriptions and pricing plan checks.
  - SDK: `stripe` npm package v16.12.
  - Auth: API key stored in `STRIPE_SECRET_KEY` env variable.

**Messaging & Notifications:**
- **Telegram Bot**
  - Purpose: TMA (Telegram Web App) entry, user authentication, odds alerts, and bot polling.
  - Client: Custom TS scripts (`apps/web/scripts/telegram-poll.ts` and `apps/worker/src/notify.ts`).
  - Auth: API key stored in `TELEGRAM_BOT_TOKEN` env variable.

**AI Capabilities:**
- **OpenAI API**
  - Purpose: Backing the Pro Agent Chatbot feature.
  - SDK: Vercel AI SDK (`@ai-sdk/openai`).
  - Auth: API key in `OPENAI_API_KEY` env variable.

## Data Storage

**Databases:**
- **PostgreSQL**
  - Purpose: Relational database holding user tables, subscriptions, fixtures, odds snapshots, and predictions.
  - Connection: Connection pool via `DATABASE_URL` env variable (mapping to local port 5434 in development).
  - Client: Prisma ORM.
  - Migrations: Managed via Prisma in `prisma/migrations/`.

**Local Data Files:**
- **JSON Exchange Payloads**
  - Purpose: Exchanging structured model predictions and metrics between the Python engine and TypeScript services.
  - Location: Generated into `apps/web/public/data/` (e.g., `league_bundle.json`, `shadow_models.json`, `weekly_digest.json`).

## Environment Configuration

**Development:**
- Local Postgres container run via `docker compose`.
- Mock data source option (`--source mock`) available in Python CLI to run completely offline without downloading real CSVs.

**Secrets Management:**
- Stored in a local gitignored `.env` file for dev.
- Expected to be managed via Hosting Platform environment variables (e.g., Vercel / Docker secrets) in production.
