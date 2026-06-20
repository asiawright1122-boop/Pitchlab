# Task Plan - PitchLab Multi-Platform Consistency Review

## Goal
Perform a comprehensive audit and consistency review across Frontend, Backend, API, Database, and TG Mini App components regarding shadow models, promotion criteria, model IDs, and data serialization formats. Fix any discrepancies to guarantee absolute consistency.

## Phase 1: Research & Discovery
- [x] Find all occurrences of model IDs (`dc-raw-v0.1`, `dc-isotonic-v0.1`, etc.) across all code directories.
- [x] Locate the TG Mini App component and analyze its data requirements and models.
- [x] Inspect Database Schemas, API Route handlers, and DTOs/serializers for models and promotion policies.
- [x] Summarize inconsistencies in `findings.md`.

## Phase 2: Implementation & Synchronization
- [x] Sync model definitions and model IDs (`dc-beta-calibrated-v0.1`, `dc-ml-residual-v0.1`) across components if needed.
- [x] Sync database tables/Prisma schema if they record model promotion history or results.
- [x] Sync API endpoints/types representing the shadow policy and ECE gate.
- [x] Sync TG Mini App displaying models or model states.
- [x] Ensure database constraints and settings table alignment.

## Phase 3: Verification & Validation
- [x] Run typescript/linter checks across apps/web.
- [x] Run standard database test suite.
- [x] Verify the system correctly renders/stores the new calibrated models and ECE promotion gate decisions.
- [x] Document outcomes in `progress.md`.
