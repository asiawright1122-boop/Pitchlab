# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**TypeScript:**
- **Files:** kebab-case for general scripts and routing files (e.g. `test-db-setting-sync.ts`), PascalCase for React views and components (e.g. `ShadowModelsPanel.tsx`).
- **Functions:** camelCase for general functions, PascalCase for custom hook files or component builders.
- **Variables:** camelCase for objects and local states. UPPER_SNAKE_CASE for environment configurations or static configurations.
- **Types/Interfaces:** PascalCase (e.g. `Fixture`, `PublishedArtifact`).

**Python:**
- **Files:** snake_case for modules (e.g. `ml_challenger.py`, `dixon_coles.py`).
- **Functions:** snake_case for helper functions and methods (e.g. `evaluate_promotion`).
- **Variables:** snake_case for standard parameters and instances. UPPER_SNAKE_CASE for hyperparameters or constant bounds (e.g. `PNL_THRESHOLD`, `BRIER_MARGIN`).
- **Classes:** PascalCase (e.g. `Match`, `BacktestConfig`).

## Code Style & Formatting

**TypeScript/Next.js:**
- Semi-colons: Required (or standardized by Next.js configs).
- Quotes: Double quotes inside TSX/JSX, single or double quotes in TS code.
- Indentation: 2 spaces.

**Python:**
- Formatting: Follows standard PEP 8 configurations.
- Type Hints: Extensively used (`from __future__ import annotations`, `list[int]`, `dict[str, Any]`, `Path | None`).
- Line limits: 88 characters (Black style compatible).

## Import Organization

**TypeScript:**
- Grouping:
  1. Node.js built-ins.
  2. External dependencies (`next`, `react`, `@prisma/client`).
  3. Custom UI components and local hooks.
  4. Relative path helpers.

**Python:**
- Grouping:
  1. Standard library imports (`from __future__ import annotations`, `import json`, `from pathlib import Path`).
  2. Third-party packages (`import numpy as np`, `from sklearn.preprocessing import StandardScaler`).
  3. Local module imports (`from ..data.schema import Match`, `from ..league.elo import fit_league_elo`).

## Error Handling

**TypeScript:**
- Try/catch blocks around asynchronous calls, database transactions, and third-party API fetches.
- Return structured API error responses (e.g., `{ success: false, error: "message" }`) with appropriate HTTP status codes from Next.js endpoints.

**Python:**
- Graceful catch blocks around scikit-learn imports so that ML shadow evaluation fails gracefully into a skipped status (e.g., if scikit-learn is not installed, returning a dict with `status: skipped` rather than crashing).
- Explicit error handling during historical CSV file downloads or JSON file parsing.

## Logging

**TypeScript:**
- Uses `console.log` for build-time operations and info scripts, and `console.error` for errors.

**Python:**
- Standard output printing via `print()` in CLI commands.
- Run logging captured via `RunLogger` inside `pitchlab/agent/runlog.py` for taskgraph status reporting.
