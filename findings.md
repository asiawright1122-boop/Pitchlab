# Findings - PitchLab Multi-Platform Consistency Review

## Model Identifiers and Schema Status
- **TG Mini App (TMA) APIs**: Located in `apps/web/app/api/tma/`. Notable routes: `matches/route.ts`, `insights/route.ts`. Checked and fixed prediction selection model version mismatch.
- **Telegram Bot Logic**: Located in `apps/web/lib/telegram-bot.ts` and `apps/web/scripts/telegram-poll.ts`. Checked; relies entirely on database settings, no hardcoded models.
- **Worker Promotion Notifier**: Located in `apps/worker/src/notify-promotion.ts`. Added ECE Gate to Telegram and Email alert templates.
- **Worker DB Sync & Team Alignment**: Located in `apps/worker/src/sync.ts` and `align.ts`. Verified they dynamically parse `shadow_models.json` policy and DB variables without hardcoding. Fully consistent.
- **Weekly Digest**: Located in `engine/pitchlab/feedback/weekly_digest.py`. Verified that it dynamically fetches and prints the active champion/challenger labels from artifacts. Fully consistent.
- **Database Schema**: Located in `prisma/schema.prisma`. All fields (`Prediction.modelVersion`) support new model IDs like `dc-beta-calibrated-v0.1` and `dc-ml-residual-v0.1`.

## Discrepancies and Inconsistencies Found
1. **Model prediction leakage/mismatch in `tma/insights`**:
   * File: [insights/route.ts](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/app/api/tma/insights/route.ts)
   * Status: **RESOLVED**. Added target model matching and filtering matching `matches/route.ts`.
2. **Missing ECE Gate in notification alerts**:
   * File: [notify-promotion.ts](file:///Users/kaka/Dev/Oobs/PitchLab/apps/worker/src/notify-promotion.ts)
   * Status: **RESOLVED**. Included ECE Gate status check in broadcast templates.
3. **Thorough Audit Findings (All other areas)**:
   * Status: **VERIFIED CONSISTENT**. All other data-flow endpoints are model-agnostic and dynamically sync with database configs.

