# Deploy PitchLab (sketch)

## Web (Vercel)

1. Import repo; root directory `apps/web`
2. Build: `npm run build` (from monorepo root, set **Root Directory** to repo root and **Build Command** `cd ../.. && npm install && npm run build -w pitchlab-web`, or configure per Vercel monorepo docs)
3. Env vars:
   - `DATABASE_URL` (managed Postgres, SSL)
   - `SESSION_SECRET` (32+ chars)
   - `NEXT_PUBLIC_SITE_URL` = production URL
   - Optional: `STRIPE_*`, `FOOTBALL_DATA_TOKEN`

4. Run migrations from CI or local: `npx prisma migrate deploy`

## Database

- Neon / Supabase / Railway Postgres
- Use same schema as local (`prisma/migrations`)

## Worker / pipeline

- Cron host (GitHub Actions, Railway cron, or VM):
  ```bash
  ./scripts/pipeline.sh
  ```
- Requires engine venv on the runner or pre-built Docker image
- `DATABASE_URL` + optional `TELEGRAM_BOT_TOKEN`

## Stripe production

- Live keys + webhook endpoint `https://your-domain/api/billing/webhook`
- Price ID in `STRIPE_PRO_PRICE_ID`

## Post-deploy smoke

- `GET /api/health` → `db: connected`
- `/record` loads backtest
- `/login` → Pro dev or Stripe upgrade
