# Phase 0 规格:真相机器(Truth Machine)

> **状态:工程已完成 · 闸门已结案 (2026-06-03)** — 无样本外 edge,见 [`research/14-phase0-go-nogo.md`](../research/14-phase0-go-nogo.md)
>
> 目标:**先证伪**。用免费历史数据(含 Pinnacle 收盘)回测,测出样本外 CLV,回答"有没有 edge"。
> 语言:Python · 位置:`engine/`

---

## 1. 验收标准

- [x] 能用内置 **mock 数据**离线跑通完整回测(无需联网)
- [x] 能从 **football-data.co.uk** 下载并解析真实历史 CSV
- [x] 实现 **Dixon-Coles** 概率引擎,拟合并输出比分分布
- [x] 从比分矩阵**派生** 1X2 / 大小球(O/U 2.5)/ 亚盘 概率
- [x] 实现 **devig**(去抽水得市场真实概率)
- [x] 计算 **CLV / Brier / ROI**,按联赛/市场分组
- [x] **walk-forward** 回测(无未来信息泄漏)
- [x] CLI:`pitchlab download` / `pitchlab backtest`
- [x] 单元测试覆盖核心数学(派生、devig、CLV、Brier)
- [x] **Go/No-Go 闸门已跑**:主流联赛无 +2% CLV → 产品转 C 定位(见 14-go-nogo)

---

## 2. 模块设计

```text
engine/
├── pyproject.toml
├── pitchlab/
│   ├── __init__.py
│   ├── cli.py                 # CLI 入口(download / backtest)
│   ├── data/
│   │   ├── footballdata.py    # football-data.co.uk 下载 + 解析
│   │   ├── schema.py          # Match 数据结构
│   │   └── mock.py            # 合成数据生成(离线可跑)
│   ├── models/
│   │   └── dixon_coles.py     # Dixon-Coles MLE 拟合 + 比分矩阵
│   ├── markets/
│   │   └── derive.py          # 比分矩阵 → 1X2 / O-U / AH 概率
│   ├── odds/
│   │   └── devig.py           # 去抽水(multiplicative/ Shin 可选)
│   ├── metrics/
│   │   ├── clv.py             # 收盘线价值
│   │   ├── brier.py           # 概率校准
│   │   └── roi.py             # 收益率 / yield
│   └── backtest/
│       └── harness.py         # walk-forward 引擎
└── tests/
```

---

## 3. 核心数学

### 3.1 Dixon-Coles
- 双泊松基础:`λ_home = exp(μ + home_adv + atk_home - def_away)`,`λ_away = exp(μ + atk_away - def_home)`
- 低比分相关性修正 τ(ρ 参数)
- 时间衰减权重 ξ(近期比赛权重更高)
- MLE 拟合(scipy.optimize)

### 3.2 全市场派生
- 比分矩阵 `P[i][j]`(主队 i 球,客队 j 球)
- 1X2:主胜=Σ(i>j),平=Σ(i=j),客胜=Σ(i<j)
- O/U 2.5:over=Σ(i+j≥3)
- AH:按让球线对矩阵求和

### 3.3 devig(去抽水)
- 输入:某市场各结果的赔率
- multiplicative:`p_i = (1/o_i) / Σ(1/o_j)`
- (可选)Shin 方法
- 输出:市场隐含**真实概率**(基准)

### 3.4 CLV
- `CLV% = (closing_fair_prob - bet_implied_prob) / bet_implied_prob`
- 或赔率口径:`你的赔率 / 收盘公允赔率 - 1`
- 用 **Pinnacle 收盘**(football-data.co.uk 有 PSCH/PSCD/PSCA 列)做 fair 基准

### 3.5 评测
- **Brier**:`mean((p - outcome)^2)`,越低越好
- **ROI/Yield**:按策略(value bet)下注后的收益率
- 分组:联赛 / 市场 / (后续)情境

---

## 4. walk-forward 协议
1. 按时间排序所有比赛
2. 滚动窗口:用 t 之前 N 场训练 → 预测 t → 记录 → 前移
3. **绝不**用未来数据训练
4. 输出样本外 CLV/Brier/ROI 曲线

---

## 5. Go/No-Go 闸门
- 某联赛/市场 **样本外 CLV ≥ +2%**(充分样本)→ 有 edge,进入产品化
- 全 -EV → 转纯工具/内容定位,不硬做自营预测

---

## 6. 数据源说明
- football-data.co.uk:免费 CSV;关键列 FTHG/FTAG(比分)、B365H/D/A(软盘)、**PSCH/PSCD/PSCA(Pinnacle 收盘)**、AvgC>2.5/AvgC<2.5(大小球收盘)等
- 联赛代码:E0=英超,E1=英冠,D1=德甲,SP1=西甲,I1=意甲,F1=法甲 等
