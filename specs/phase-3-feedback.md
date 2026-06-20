# Phase 3 规格:反馈进化 + 自动化

> **状态**: 进行中 · **开始**: 2026-06-03

---

## 1. 目标

在不改变「无自营 alpha」前提下，把 **L7 反馈** 产品化：

1. 每次 pipeline 运行后生成 **反馈快照**（汇总 CLV 回测 + 联赛监控 + Agent 状态）
2. 追加到 **metrics_history.json**（滚动时间序列，供看板对比）
3. Champion/Challenger **记录**（回测 vs hold-out 监控并列，人工判断）
4. cron / pipeline 端到端（复用 Phase 1 `scripts/pipeline.sh`）

---

## 2. 验收标准

- [x] `pitchlab feedback snapshot` 写入 `feedback_snapshot.json` + 追加 `metrics_history.json`
- [x] pipeline 末尾自动调用 feedback snapshot
- [x] Web「Feedback」Tab 展示历史 CLV/Brier 趋势
- [x] Worker `db:sync` 将 `league_predictions` + `predictions` 写入 `fixtures` / `predictions` 表
- [x] `GET /api/predictions` 查询最近快照
- [x] **`pitchlab settle`** — 自动下载/读取 football-data.co.uk 赛果 → `settlements.json` → 回填 `fixtures`（JSON + DB sync）
- [x] **预测级 CLV** — `odds_snapshots` 表 + `odds_snapshots.json`（`settle --with-clv`）+ `GET /api/odds-snapshots` + Feedback Tab
- [ ] 影子模式自动切换 — Phase 5 / 需正 CLV 基座

---

## 3. Go/No-Go（Phase 3）

**实时 CLV ≈ 回测 CLV?** — 当前基座为负 CLV，仅记录差距用于透明度，不触发模型切换。
