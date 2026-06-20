# Phase 0 Go/No-Go 结案报告

> **状态**: 已完成 · **日期**: 2026-06-03  
> **结论**: **No-Go** — 主流联赛 1X2 value 策略无样本外 edge → 产品定位锁定 **C（量化研究台）+ B（透明研究内容）**

---

## 1. 实验目的

用 Phase 0「真相机器」在**免费历史数据 + Pinnacle 收盘**上回答：

> Dixon-Coles 1X2 模型 + 固定 edge 阈值，能否在样本外持续获得 **CLV ≥ +2%**？

闸门定义见 `specs/phase-0-truth-machine.md` §5 与 `engine/pitchlab/backtest/harness.py` `_verdict`。

---

## 2. 实验设置

| 项 | 值 |
|---|---|
| 数据源 | [football-data.co.uk](https://www.football-data.co.uk/) CSV |
| 赛季 | 2021, 2022, 2023, 2024 |
| 概率引擎 | Dixon-Coles（MLE，时间衰减 ξ） |
| 市场 | 1X2 |
| 去抽水 | `devig_power`（收盘作 fair 基准） |
| 下注规则 | `model_prob - price_implied > edge_threshold` |
| edge_threshold | **2%** |
| min_train | **380** 场（联赛回测） |
| refit_every | **30** 场 |
| 校准 | **isotonic** 滚动校准（`calibrate: true`） |
| CLV 基准 | Pinnacle 收盘（PSCH/PSCD/PSCA） |
| 下注价 | 开盘/软盘价（open_* 字段） |
| 复现 | `apps/web/public/data/backtest.json`、`leagues.json` |

---

## 3. 结果摘要

### 3.1 五大联赛 + 英冠（walk-forward，样本外）

| 联赛 | 代码 | 预测场数 | 纸面下注数 | 平均 CLV | ROI | 判定 |
|------|------|----------|------------|----------|-----|------|
| 英超 | E0 | 1130 | 975 | **-8.76%** | -13.85% | No edge |
| 德甲 | D1 | 837 | 649 | **-6.90%** | -13.18% | No edge |
| 西甲 | SP1 | 1132 | 770 | **-7.74%** | -13.72% | No edge |
| 意甲 | I1 | 1129 | 805 | **-6.26%** | -14.29% | No edge |
| 法甲 | F1 | 987 | 813 | **-6.57%** | -12.54% | No edge |
| 英冠 | E1 | 1804 | 1291 | **-7.27%** | -0.30% | No edge |

- 所有联赛 `n_bets` ≫ 50（统计上足够否定「+2% CLV」假设）
- Brier ≈ 0.59–0.63（1X2 概率质量一般，但不是本次闸门主因）
- ECE 较低（校准后概率层级尚可），但 **CLV 一致为负** → 相对收盘线系统性吃亏

### 3.2 汇总判定

```text
summary_verdict: No league shows out-of-sample +CLV vs sharp closing odds
                 — confirms the honest no-edge conclusion.
                 Product value is the transparent tool, not betting alpha.
```

---

## 4. 决策（锁定）

### D18. Phase 0 Go/No-Go ✅

| 选项 | 结论 |
|------|------|
| **A. 自营投注信号** | **No-Go** — 不在主流联赛 1X2 上继续投入预测 alpha 研发 |
| **B. 纸面验证** | 保留 harness 作内部监控；不对外承诺盈利 |
| **C. 量化研究台 / 工具** | **Go** — 透明回测、CLV 曲线、模型 vs 市场、世界杯模拟 |
| **D. 透明研究内容 (B)** | **Go** — 公开负 CLV 作为信任资产 |

**产品北极星（修订）**：

1. 用 CLV **证伪**而非包装「稳赚」
2. 引擎 + 看板 + Agent 流水线服务**研究与理解**
3. 世界杯 2026 等内容轨独立于联赛 edge 结论

**明确不做（直至有新证据）**：

- 主流联赛 Dixon-Coles 1X2 大规模调参
- 以「荐彩/必中」为卖点的推送
- LLM 修正概率（P3）在无正 CLV 基座上启动

**可选、有上限的后续实验**（非阻塞 Phase 1）：

- ≤3 人日：O/U 2.5 或亚盘、次级联赛；到期无 +2% CLV 则封存

---

## 5. 工程状态

Phase 0 **技术验收**（见 `specs/phase-0-truth-machine.md`）均已实现：

- mock / football-data 回测、Dixon-Coles、派生市场、devig、CLV/Brier/ROI、walk-forward、CLI、45 项测试

**Phase 0 产品闸门**：未通过（无 edge）→ **战略上仍算成功**（诚实证伪，避免沉没成本）。

---

## 6. 下一步（Phase 1 主战线）

1. PostgreSQL + Prisma（fixtures / predictions / metrics）
2. Worker：定时跑 `pitchlab backtest` / `worldcup` → 写库
3. Web：战绩与预测从 API 读取；保留「公开负 CLV」叙事
4. 世界杯：替换或明确标注 illustrative 分组；内容轨与联赛回测分离

详见 `docs/roadmap.md`（Phase 0 已标记完成）。

---

## 7. 引用

- 决策总表：`research/00-decisions.md`（D18）
- 回测 JSON：`apps/web/public/data/backtest.json`、`leagues.json`
- 引擎闸门代码：`engine/pitchlab/backtest/harness.py`
