# Phase 5 规格:影子模型 / ML / Agent

> **状态**: 起步 · **开始**: 2026-06-03

---

## 1. 目标

在 **无自动切换**（Phase 0 No-Go）前提下：

1. **Champion / Challenger** 并排记录（DC+isotonic vs DC raw）
2. **Shadow ML** 占位（GBM 未训练）
3. 反馈快照纳入 `shadow_models.json`
4. 为日后 Hermes/Agent 外挂留 MCP 接口（后置）

---

## 2. 验收 (MVP)

- [x] `pitchlab models shadow` → `shadow_models.json`
- [x] `feedback snapshot` 读取 shadow 策略与 E0 对比
- [x] Web Feedback Tab · `ShadowModelsPanel`
- [x] 可选 ML challenger（`pip install -e '.[ml]'` → Logistic + Elo 特征）
- [x] 真实 GBM/XGBoost challenger 训练
- [x] Agent `daily` pipeline（shadow → feedback snapshot）
- [x] Hermes MCP 挂载

---

## 3. 晋升策略（硬编码）

```text
auto_promote: false
promote_if: avg_clv >= 2% for 90d AND challenger Brier < champion Brier
```

---

## 4. CLI

```bash
cd engine && pitchlab models shadow --all --seasons 2022 2023 2024 \
  --source football-data --export-json ../apps/web/public/data
npm run db:sync
```
