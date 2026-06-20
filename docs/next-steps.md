# PitchLab — 建议下一步 (2026-06-03)

Phase 0–4 MVP 已落地。按产品定位 **C 工具 + B 内容**、且 Phase 0 已 **No-Go 自营信号**，建议优先级如下。

## 立即可做（1–2 天）

| # | 方向 | 产出 | 说明 |
|---|------|------|------|
| 1 | ~~**Stripe 计费**~~ | ✅ Checkout + webhook 骨架 | 配置 `STRIPE_*` env 后可用 |
| 2 | ~~**年龄门**~~ | ✅ `AgeGate` 首次确认 18+ | 已完成 |
| 3 | **Live 赛程** | `npm run fixtures:live` + pipeline（需 token） | ✅ 状态/比分映射；`/matches` 显示 FT |

## 中期（1–2 周）

| # | 方向 | 产出 |
|---|------|------|
| 4 | ~~**Telegram Bot**~~ | ✅ webhook/poll · Connect 深链 · `npm run notify` |
| 5 | ~~**预测级 CLV**~~ | ✅ `odds_snapshots` + API + Feedback Tab | 已完成 2026-06-03 |
| 6 | ~~**内容分发**~~ | ✅ OG 图 · 研究笔记 · `weekly_digest.json` + `/weekly` |

## 已完成（虚拟本金）

- ✅ 登录即 **10,000** 研究单位 · **Paper portfolio** Tab · pipeline 赛果自动结算

## 后置 / 可选

- ~~Paper 增强~~ ✅ `/matches` 下单 · ¼-Kelly 上限 · 匿名榜 · vs `/record`
- Hermes/Agent 外壳（Phase 5）
- ML 集成、残差修正
- B2B 多租户 API

## 本地验证清单

```bash
npm run db:up && npm run db:migrate && npm run db:seed
npm run pipeline && npm run db:sync
npm run dev:web
# /login (Dev Pro) → Value / League model
# /record → 公开战绩（无需登录）
```
