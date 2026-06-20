# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
PitchLab/
├── apps/
│   ├── web/                # Next.js Web Application
│   │   ├── app/            # App router pages (pricing, record, matches, admin, etc.)
│   │   ├── components/     # React UI elements (ShadowModelsPanel, AgeGate, etc.)
│   │   ├── public/         # Static assets and exported Python JSON data files
│   │   └── scripts/        # Web utility scripts (e.g. telegram-poll.ts)
│   └── worker/             # Background Worker Service
│       └── src/            # Core TS files (sync.ts, notify.ts, alerts.ts)
├── docker-compose.yml      # Dev Postgres container configuration
├── engine/                 # Quantitative Engine (Python)
│   ├── pitchlab/           # Main package source
│   │   ├── agent/          # Pipeline task graph and orchestrated execution
│   │   ├── backtest/       # Backtesting engine harness
│   │   ├── cleaning/       # Data clean utilities
│   │   ├── feedback/       # Settlement, CLV computation, and metrics historical snapshots
│   │   ├── league/         # ELO computation and league predictions
│   │   ├── metrics/        # Multi-class Brier, Log Loss, and Calibration error logic
│   │   ├── models/         # Calibrations, Dixon-Coles, ML challengers, and Auto-promotion
│   │   └── worldcup/       # World Cup simulation & value export
│   ├── pyproject.toml      # Python dependencies, metadata, and CLI command registrations
│   └── tests/              # Pytest test suite for engine modules
├── prisma/                 # Prisma configuration, schema.prisma, and seed.ts
└── scripts/                # Shared shell automation scripts (pipeline.sh)
```

## Directory Purposes

**apps/web/app/**
- Purpose: Next.js pages routing, client dashboards, billing, and bot bindings.
- Contains: Layouts, page files, and Next.js server actions / API route handlers.

**apps/worker/src/**
- Purpose: Asynchronous scheduling, data syncing, and alert distribution.
- Key files:
  - `sync.ts`: Synchronizes exported JSON outputs from the python engine into Postgres.
  - `alerts.ts`: Scans for odds anomalies matching user strategies to enqueue notifications.
  - `notify.ts`: Connects to Telegram API to deliver notifications.

**engine/pitchlab/models/**
- Purpose: Core probability models and promotion rules.
- Key files:
  - `dixon_coles.py`: Dixon-Coles statistical match outcome prediction.
  - `ml_challenger.py`: Scikit-learn Logistic Regression and GBM classifiers.
  - `calibration.py`: Isotonic regression calibration.
  - `shadow.py`: Shadow model evaluation wrapper.
  - `promotion.py`: Implementation of auto-promotion gating rules.

**prisma/**
- Purpose: Persistence layer structure and database seeding.
- Key files:
  - `schema.prisma`: Defines Postgres database schemas (`User`, `Fixture`, `OddsSnapshot`, `Prediction`, `PaperTrade`, `AlertSubscription`, etc.).
  - `seed.ts`: Seeds the local database with initial mock users and subscription plans.

**scripts/**
- Purpose: High-level pipeline orchestration.
- Key files:
  - `pipeline.sh`: Automation script executing python predictions, database exports, and worker sync commands.

## Key File Locations

**Entry Points:**
- `apps/web/package.json` -> Runs next dev (`npm run dev:web`)
- `apps/worker/package.json` -> Run commands like `npm run sync`, `npm run notify`
- `engine/pitchlab/cli.py` -> Runs the `pitchlab` shell CLI commands

**Configuration:**
- `package.json` (root): Orchestrates mono-repo workspaces and commands
- `prisma/schema.prisma`: Core database layout definition
- `engine/pyproject.toml`: Python packages and environment configurations

## Naming Conventions

**TypeScript:**
- Files: kebab-case for modules/scripts (`telegram-poll.ts`), PascalCase for React components (`ShadowModelsPanel.tsx`).
- Variables/Functions: camelCase (`expectedCalibrationError`).
- Types/Interfaces: PascalCase (`MatchUnlock`).

**Python:**
- Files: snake_case for modules (`ml_challenger.py`, `dixon_coles.py`).
- Functions/Variables: snake_case (`evaluate_promotion`).
- Classes: PascalCase.

## Where to Add New Code

**New ML Model Challenger:**
- Code: Add a function or model class inside `engine/pitchlab/models/ml_challenger.py`.
- Integration: Hook the new model into `compare_shadow` inside `engine/pitchlab/models/shadow.py`.
- Tests: Add corresponding unit tests in `engine/tests/` (e.g. `test_ml_challenger.py`).

**New Web Route or Page:**
- Add folder structure inside `apps/web/app/` with a `page.tsx` and matching layout/components.

**New Alert or Worker Job:**
- Script: Create or modify jobs inside `apps/worker/src/`.
- Commands: Register execution scripts inside `apps/worker/package.json`.
