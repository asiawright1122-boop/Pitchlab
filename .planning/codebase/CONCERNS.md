# Codebase Concerns

**Analysis Date:** 2026-06-09

## Tech Debt

**Implicit Local File Sync:**
- Issue: The Python engine writes JSON files directly to `../apps/web/public/data/` (e.g. inside `shadow.py` and `cli.py`).
- Why: Simple and fast monorepo development.
- Impact: If the Next.js web application and the Python engine are deployed onto separate containers, servers, or serverless functions (like Vercel and AWS Lambda), local file writes will fail or won't be visible to the web client.
- Fix approach: Transition to an object store (e.g., Supabase storage, AWS S3) or database-backed storage for exchange payloads.

**Auto-Promotion configuration persistence:**
- Issue: Auto-promotion writes to `pipeline_config.json` inside the web public data folder.
- Why: Minimal overhead way to persist the promoted model ID offline.
- Impact: Ephemeral file storage will lose this state on deployments or scale events.
- Fix approach: Store the promoted champion model ID in the `SystemSetting` table in PostgreSQL.

## Security Considerations

**API Key Environment Variables:**
- Risk: Missing validation for sensitive external API tokens (`FOOTBALL_DATA_TOKEN`, `THE_ODDS_API_KEY`, `TELEGRAM_BOT_TOKEN`, `STRIPE_SECRET_KEY`) can lead to unhandled runtime failures or crashes.
- Recommendation: Add a verification/pre-flight step in the entry points to fail fast with a clear error message if essential variables are missing.

## Performance Bottlenecks

**Odds Snapshot growth:**
- Problem: The `odds_snapshots` table grows rapidly (7950 snapshots already present).
- Cause: Regular cron tasks snapshotting book odds per fixture.
- Impact: Large table size will eventually degrade query performance on matches dashboards.
- Fix: Implement a data pruning/archiving policy for snapshots older than 90 days, or optimize table indexes.

## Fragile Areas

**Scikit-Learn optional import:**
- File: `engine/pitchlab/models/ml_challenger.py`
- Why fragile: Challenger evaluations silently fall back to skipped states if `scikit-learn` fails to import, making it hard to notice if shadow model pipelines are not executing because of environment/dependency mismatch.
- Fix: Add explicit environment verification checks to the `shadow` command.

**Stripe and Telegram Bot Skeletons:**
- File: `apps/web/app/pricing/` and `apps/worker/src/notify.ts`
- Why fragile: Elements of billing and notifications are stubbed or lightweight skeletons. Transitioning to real Stripe hooks or heavy notification traffic is highly sensitive to connection timeouts.

## Test Coverage Gaps

**TypeScript/Next.js Gaps:**
- What's not tested: There are no unit or integration tests for `apps/web` or `apps/worker`.
- Risk: Component regressions on the dashboard (such as the `Feedback` tab or `ShadowModelsPanel`), payment flow breaks, and worker queue failures will pass undetected.
- Priority: High.
- Difficulty: Requires configuring Vitest/Playwright inside the monorepo.
