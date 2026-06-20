# PitchLab status (2026-06-09)

## Product pivot

Phase 0 walk-forward: **no sample-out +CLV edge** on top leagues → **Go** transparent tool (C) + public track record (B), **No-Go** tipster/betting alpha.

## Shipped

| Phase | Highlights |
|-------|------------|
| 0 | Go/No-Go report, research/14-phase0-go-nogo.md |
| 1 | Prisma, docker Postgres :5434, worker sync, API artifacts |
| 2 | `pitchlab league export`, League model tab |
| 3 | feedback snapshot, settle, **7950 odds_snapshots** in DB |
| 4 | login/Pro gate, /pricing, Stripe skeleton, Telegram notify, **paper portfolio** |
| 5 | Shadow models: DC/logreg/GBM challengers, **CLV + Brier auto-promote gates**, `ShadowModelsPanel`, `pull-config.ts` DB↔TS↔Python config sync |
| 6 | Pro SaaS Features: Value Dashboard (Slice A), Telegram Odds Alerts (Slice B), Pro Agent Chat (Slice C) |
| B | `/record` public page, OG image, `/weekly` digest, sitemap, age gate |

## Commands

```bash
npm run db:up && npm run db:migrate && npm run db:seed
./scripts/pipeline.sh   # includes db:pull-config + engine + db:sync
npm run dev:web    # :3000
npm run notify     # after Pro + telegram bind
```

## Env checklist

- `DATABASE_URL` (port 5434)
- `SESSION_SECRET`
- Optional: `FOOTBALL_DATA_TOKEN`, `STRIPE_*`, `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_SITE_URL`

## Phase 5 — done

- `pitchlab models shadow` → DC champion + DC/logreg/GBM challengers
- Auto-promote pipeline: `db:pull-config` (TS→DB→JSON) → Python engine reads `pipeline_config.json` → writes `shadow_models.json`
- CLV gate reads `avg_clv` from `metrics_history.json` (90d, 7+ snapshots ≥ 0.0)
- Brier gate: best challenger Brier must beat champion
- `npm run db:seed` → seeds `SystemSetting.active_model_version` + generates mock `metrics_history.json`
- `ShadowModelsPanel` shows `CLV: ✓ OK` and `Brier: ✓` when gates pass
- 升级付费赛事研报系统 (TMA Insights)：接入历史 CLV、ECE、Brier 以及主客队最新 Elo Rating，提取 15 次赔率走势，更新 Prompt 为冷峻量化风格。
- 三级智能队名对齐与自进化缓存网关：完成跨语言对齐别名。Python 引擎记录未知并导出 `unmapped_teams.json`；Worker 侧自适应调用大模型对齐并写回 `names_registry.json`，实现清洗层零依赖自进化。
- 自动晋升多渠道推送系统：在影子模型达成晋升指标触发 Champion 模型更替时，自动对 Pro 用户广播 Telegram 喜报，并对管理员发送排版精美的 HTML 审计报告邮件 (基于 Resend API)。
- 注册与登录模块（正式化与美化）：重构 `/login/page.tsx` 页面为极富设计美感、支持 Tab 切换与初始虚拟 RU 金额自动注入的毛玻璃暗调样式。
- 订阅退订与升级通道（Stripe Billing Portal）：新建了 `/api/billing/portal` API，实现在不修改数据库 schema 前提下动态拉取 Stripe 客户并调起 Billing Portal 订阅一键退订与管理；升级 `/pricing` 前端逻辑，根据用户 planId 显示“管理与退订/升级”的相应状态及 Banner。
- 安全且统一的管理权限拦截：新建 `apps/web/lib/admin.ts` 并引入 `verifyAdminSession`，重构了所有 admin API 接口的权限验证，防御越权风险。
- 队名别名管理控制台 (Team Names Registry Editor)：新建队名别名编辑 API (`api/admin/names-registry`) 及前端组件 `NamesRegistryPanel`。支持在后台查阅、新增别名对齐、新增标准队名与一键别名删除。
- 影子模型自动晋升控制面板 (Promotion Policy Console)：新建政策配置 API (`api/admin/promotion-policy`)。在 `/admin/settings` 面板中添加自动晋升策略参数配置表单；并使得同步 Worker 动态支持数据库控制覆盖。
- 用户与账目管理大盘：新建用户 API (`api/admin/users`) 与页面 `/admin/users/page.tsx`，支持在后台查阅所有用户的注册状态与 RU 模拟金余额、行内一键充值/升级 Pro、以及物理删除垃圾账号。

## Next (optional)

- Production deploy — see `docs/deploy.md`
