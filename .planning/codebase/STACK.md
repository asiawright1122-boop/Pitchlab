# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript 5.5.3 - Used for the web application and worker service
- Python >=3.10 - Used for the quantitative probability engine and ML challenger models

**Secondary:**
- JavaScript - Build and configuration files

## Runtime

**Environment:**
- Node.js 20.x - Executes the Next.js app and the TypeScript background worker scripts
- Python 3.10+ - Runs the ML and statistical league export engine (Dixon-Coles, Elo, scikit-learn)

**Package Managers:**
- npm 10.x - Manages Node.js workspaces (`apps/web`, `apps/worker`) with `package-lock.json`
- uv (or pip) - Manages Python virtual environments and dependencies inside `engine/` with `uv.lock`

## Frameworks

**Core:**
- Next.js 14.2.5 - Frontend dashboard and API routes (`apps/web`)
- React 18.3.1 - User interface framework for the Next.js app
- Prisma ORM 5.22.0 - Schema definition and database client code generation

**Testing:**
- pytest 9.0.3 - Test runner for the Python engine codebase

**Build/Dev:**
- tsx - TypeScript execution runner (used for scripts and background worker tasks)
- tailwindcss 3.4.6 - CSS styling framework

## Key Dependencies

**TypeScript/Next.js:**
- `@ai-sdk/openai` & `ai` (v6.0.197) - Vercel AI SDK for LLM-powered Pro Agent Chat
- `@twa-dev/sdk` (v8.0.2) - Telegram Web App (TMA) SDK
- `iron-session` (v8.0.4) - Stateless session management
- `stripe` (v16.12.0) - Stripe Billing integration
- `recharts` (v3.8.1) - Visualization charts for dashboards

**Python Engine:**
- `numpy` (>=1.24) - Numerical computations and ELO arrays
- `scipy` (>=1.10) - Dixon-Coles optimization and Poisson probability calculations
- `pandas` (>=2.0) - CSV handling and data manipulation
- `scikit-learn` (>=1.3) - Standard scaling, Logistic Regression, HistGradientBoosting classifiers for ML shadow models
- `mcp` (>=1.1.0) - Model Context Protocol python library

## Configuration

**Environment:**
- Configured via `.env` file containing database connections and api keys
- Key variables:
  - `DATABASE_URL`: Postgres connection string (default port 5434 in dev)
  - `SESSION_SECRET`: Session cookie encryption key
  - `TELEGRAM_BOT_TOKEN`: Token for bot integrations
  - `STRIPE_SECRET_KEY`: Billing secret key
  - `FOOTBALL_DATA_TOKEN`: Token for football-data.org API

**Build Configs:**
- `package.json` (workspace orchestrator)
- `apps/web/next.config.mjs` (Next.js configurations)
- `engine/pyproject.toml` (Python engine metadata & dependencies)

## Platform Requirements

**Development:**
- Docker Desktop (for Postgres database container)
- Node.js 20+ and Python 3.10+ installed locally

**Production:**
- Vercel (recommended for Next.js web application hosting)
- Dedicated VM / Container runtime (for worker daemon and cron execution of Python pipeline)
