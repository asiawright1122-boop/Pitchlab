- **2026-06-17**: Initialized planning files (`task_plan.md`, `findings.md`, `progress.md`). Commencing Phase 1 consistency audit.
- **2026-06-17**: Completed Phase 1 (Audit) & Phase 2 (Sync). Found and resolved two inconsistency bugs:
  1. Resolved model version mismatch in `tma/insights/route.ts` API. Filtered prediction results by `targetModel` matching active/target versions instead of simple unfiltered queries.
  2. Integrated ECE Gate status to Telegram broadcast layout and Email HTML template in `apps/worker/src/notify-promotion.ts`.
- **2026-06-17**: Completed Phase 3 (Verification).
  1. Ran `npx tsc --noEmit` in `apps/web` which completed successfully with zero compile errors.
  2. Ran backend `pytest` suite, resulting in 72 passed tests.
  3. Verified `shadow_models.json` format and database settings integration. All components are aligned and consistent.
- **2026-06-17**: Completed a secondary, comprehensive audit across other background services:
  1. Audited `weekly_digest.py` and confirmed it dynamically formats the active model names and labels without hardcoding.
  2. Audited `sync.ts` and `align.ts` worker modules and verified they handle model updates and auto-promotion variables purely dynamically via DB settings and artifacts.
  3. No other inconsistencies were found across the codebase. All ends are verified 100% synchronized and correct.
- **2026-06-17**: Resolved database constraint and settings table alignment:
  1. Baselined and resolved all four outstanding migrations (`20250603120000_init`, `20250603140000_phase4_users`, `20250603160000_odds_snapshots`, `20250603180000_paper_trading`) to align developer database instances.
  2. Updated `prisma/seed.ts` to upsert default `PROMOTION_POLICY` values, matching the system core parameters.
  3. Corrected mock webhook settle script to target Next.js dev server's dynamically assigned port (3001) and confirmed immediate bet settlement works end-to-end.
- **2026-06-22**: 完成了 PitchLab Mini App 的全面量化金融风格（Soccer-Fintech）重构：
  1. 重塑主页大盘，增加了 SVG Upset Index 与 Sentiment Index 走势图表与滑动日期轴，并在 Match Cards 中集成双向胜率滑块。
  2. 实现 3D Isometric 球场对决沙盘与实时攻防分时 SVG 波形图（Attack Momentum Wave）。
  3. 重塑 Betting Markets 盘口，引入 60 分钟临场赔率走势 Sparklines 与 Edge 荧光发光双向量尺。
  4. 新增 90+ Fergie Time 补时时光保险金盾与动态钱包余额拉取，模拟盘体验完整闭环。
  5. 成功通过 TypeScript 静态校验与 Next.js 生产构建（npm run build -w pitchlab-web），并在 3001 端口拉起本地开发服务。
  6. 对标 FootyLiveBot 的个人中心，新建了 `/profile` 个人量化大本营路由。实现基于真实结算流水的 SVG 资产净值增长曲线、量化分析师发光段位徽章、SaaS 指标面板以及一键 Tap 复制的 Telegram 裂变邀请卡。
  7. 重构全局 `BottomNav.tsx` 导航组件，支持赛程大盘、排行榜、群组及个人中心 4 大 Tab 的快速导航与祖母绿发光选中态。
