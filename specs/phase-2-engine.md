# Phase 2 规格:概率引擎产线化 + 联赛层

> **状态**: 进行中 · **开始**: 2026-06-03  
> **前置**: Phase 1 数据管道 · Phase 0 No-Go 结论不变

---

## 1. 目标

在**不改变** Phase 0 战略（无自营 alpha）的前提下：

1. **联赛 ELO** — 从 football-data.co.uk 历史赛果更新球队强度
2. **联赛预测导出** — Dixon-Coles 滚动拟合 + 样本外几场展示 + Brier 监控
3. **策略层外露** — devig / +EV / fractional Kelly 建议（分析用，非荐彩）
4. Web 可读 `league_elo.json`、`league_predictions.json`、`metrics_monitor.json`

---

## 2. 验收标准

- [x] `pitchlab league export` 离线可跑（`--source mock` 或缓存 CSV）
- [x] 输出 ELO 排名 + hold-out 1X2 概率与 Brier
- [x] `metrics_monitor.json` 含 ECE / log-loss / 样本量
- [x] Web「League model」Tab
- [x] isotonic 校准接入 `predict_holdout`（默认开启，`--no-calibrate` 关闭）
- [x] `--all` 五大联赛批量导出 + `league_bundle.json`
- [x] `league/features.py` 起步（Elo diff 等）
- [ ] （可选）`football-data.org --live` 未来赛程 · 多联赛真实 CSV 批量（需缓存/网络）

---

## 3. 模块

```text
engine/pitchlab/league/
  elo.py       # 联赛 Elo (domestic home advantage)
  predict.py   # DC fit + holdout predict + value/kelly hints
  export.py    # JSON for web/worker
```

---

## 4. Go/No-Go

Phase 2 **不重新打开**「主流联赛 +2% CLV」闸门；监控指标用于**透明度**，非自营信号。
