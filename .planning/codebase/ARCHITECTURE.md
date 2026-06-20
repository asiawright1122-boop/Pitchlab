# Architecture

**Analysis Date:** 2026-06-09

## Pattern Overview

**Overall:** Monorepo containing a Next.js web application, a TypeScript background worker, and a Python quantitative probability engine, all sharing a single PostgreSQL database.

**Key Characteristics:**
- **Polyglot Design:** Web frontend and scheduling in TypeScript/Node.js; statistical modeling, simulation, and ML training in Python.
- **Shared Database:** Both TypeScript and Python applications access the same PostgreSQL database schema.
- **Static Artifact Handshake:** Python engine exports computed results (like league predictions, ELO tables, and model comparisons) as JSON files into the web application's public data folder, enabling extremely low latency reads on the web app.
- **Monorepo Layout:** Workspaces configured for TS apps, and a sibling folder for the Python engine.

## Conceptual Layers

**Web Client & API Layer (`apps/web`):**
- Purpose: Serves the PitchLab user dashboard, handles Stripe payments, serves Telegram TMA webviews, and provides LLM Pro Agent chats.
- Depends on: Prisma database layer, OpenAI API, Stripe.
- Used by: Web browsers and Telegram TMA client.

**Worker & Notification Layer (`apps/worker`):**
- Purpose: Syncs external soccer fixtures/results, runs alert subscriptions, triggers Telegram push notifications, and coordinates cron runs.
- Contains: `sync.ts`, `notify.ts`, `alerts.ts`.
- Depends on: Prisma database layer, Telegram Bot API.

**Quantitative Engine Layer (`engine/`):**
- Purpose: Historical data download, Dixon-Coles and ELO model estimation, Monte Carlo simulation of cup tournaments, shadow model calibration, and ML challenger evaluations.
- Contains: `pitchlab.cli` commands, `pitchlab/models/`, `pitchlab/league/`, `pitchlab/backtest/`.
- Depends on: `scipy`, `pandas`, `scikit-learn`, local `.cache` folder.

**Database Schema & Migration Layer (`prisma`):**
- Purpose: Defines schema structures, relations, indexes, and triggers database migrations.
- Contains: `schema.prisma`, seed script.
- Used by: Both `apps/web` and `apps/worker`. (Python engine reads data from CSVs/APIs or directly writes exports; direct DB connections from Python are minimal, preferring the TS worker to ingest artifacts).

## Key Data Flows

**Ingestion and Pipeline Run:**
1. TS worker `sync.ts` initiates a database sync or cron runs `scripts/pipeline.sh`.
2. Python engine commands are executed:
   - `pitchlab league export` fits ELO and Dixon-Coles models, exporting JSONs to `apps/web/public/data/`.
   - `pitchlab models shadow` fits shadow models (calibrated Dixon-Coles, Logistic Regression, GBM) on training splits, compares holdout Brier scores, checks auto-promotion eligibility, and outputs `shadow_models.json`.
3. Ingested data is loaded into PostgreSQL tables like `fixtures`, `odds_snapshots`, and `predictions`.

**Odds Alert Workflow:**
1. A cron triggers `alerts.ts`.
2. The worker queries active `UserStrategy` and `AlertSubscription` rules.
3. If model probability vs Pinnacle market odds indicates an edge > threshold, a new `AlertDelivery` is generated.
4. `notify.ts` formats the Telegram message and sends it via Telegram Bot API, writing to `alert_deliveries` to avoid duplicate sends.

**Model Shadow and Auto-Promotion:**
1. Engine fits champion (`dc-isotonic-v0.1`) and challenger models on domestic leagues.
2. `promotion.py` evaluates gates:
   - **PnL Gate:** Average PnL must be positive (`>= 0.0`) across at least 7 snapshots in the last 90 days (stored in `metrics_history.json`).
   - **Brier Gate:** Challenger Brier score must be at least `0.002` better than champion Brier score on the holdout set.
3. If gates pass and `--auto-promote` is enabled, the new model ID is written to `pipeline_config.json` and becomes the new champion.

## Entry Points

**Web Server:**
- Location: `apps/web/`
- Command: `npm run dev:web` / `next dev`
- Role: Renders React views and provides REST/chat API handlers.

**Worker Commands:**
- Location: `apps/worker/src/`
- Commands: `tsx sync.ts`, `tsx notify.ts`, `tsx alerts.ts`.
- Role: Processes queue operations, pushes alerts, and synchronizes data.

**Engine CLI:**
- Location: `engine/pitchlab/cli.py`
- Command: `pitchlab <command>` (registered in `pyproject.toml`)
- Role: Entry point for downloading data, running backtests, World Cup simulations, and shadow model comparisons.
