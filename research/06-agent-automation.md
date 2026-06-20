# PitchLab #7:Agent 自动化与推送(含"能否直接用 Hermes"答疑)

> 维度:#7 Agent 自动化 / cron 节奏 / 推送渠道 / 成本控制
> 时间:2026-05-29 · 关联 D12(Agent 运行时混合路线)

---

## 1. 能否直接用 Hermes?——能,用对层次即可

| 层 | 谁来做 | 说明 |
|---|---|---|
| 编排/外壳 | **直接用 Hermes(或 OpenClaw)** | cron 调度、采集(浏览器/web search)、多渠道交付、持久记忆、技能复用 |
| 调用桥 | Hermes `execute_code` / **MCP 工具** | Hermes 调用你的量化代码,不自己算 |
| **量化内核** | **你自建(确定性代码)** | 概率引擎、devig、EV、回测——必须可重放/可审计/可回测 |
| LLM 有界节点 | LLM(便宜模型+缓存) | 仅"文本特征抽取""报告生成"两处 |

**红线:**
- ❌ 不让 Hermes"做数学"或"自由决定概率"(破坏可回测性)
- ⚠️ 不让 agent 每步过 LLM(成本失控,参考 OpenClaw $1.3M/月)→ 调**确定性脚本**

> 结论:**"直接用 Hermes" = "混合路线"**。Hermes 当壳,量化流水线作为它能调用的 MCP 工具/脚本。

---

## 2. 把量化流水线暴露成 Hermes 可调的"工具"

将核心能力封装为 MCP 工具(或 CLI 脚本),Hermes 通过 cron/skill 调用:

```text
MCP 工具(确定性,你自建):
  ingest_fixtures(window=72h)        # L1 采集赛程
  ingest_odds(match_ids)             # L1 采集赔率(软盘+锐盘)
  build_features(match_ids)          # L2+L3 清洗+特征(文本抽取调便宜 LLM)
  predict(match_ids)                 # L4 量化概率引擎(可校准)
  devig_and_value(match_ids)         # L5 去抽水+EV/value 信号
  staking_suggest(match_ids)         # L6 Kelly 建议(给用户,不执行)
  settle_and_metrics(date)           # L7 赛果回填 + CLV/ROI/Brier
  backtest(league, market, range)    # 真相机器:样本外 CLV

LLM 有界节点:
  extract_text_features(news/lineup) # 便宜模型 + 缓存
  write_report(probs, features)      # 生成可读分析
```

Hermes 的 cron + skill 只是"按时把这些工具串起来跑",所有数学在工具内部确定性完成。

---

## 3. cron 节奏(幂等、可重放)

| 任务 | 频率 | 动作 |
|---|---|---|
| 扫描赛程 | 每日 1 次 | 拉未来 72h 比赛,建任务 |
| 采集基础数据 | 每日 / 赛前 T-24h | 战绩/xG/历史 |
| **队news 监控** | 赛前 T-6h ~ T-1h 高频 | 伤停/首发(edge 窗口,§04) |
| 赔率快照 | 开盘 + 临场多次 | 软盘报价 + 锐盘基准(算 CLV 必需) |
| 生成预测+报告 | 赛前 T-? | 概率→devig→value→报告→推送 |
| **赛后结算** | 赛后 T+2h | 回填比分 → CLV/ROI/Brier → 归因 |
| 滚动再训练 | 每轮/每周 | ELO 每场更新 + 周期重训(回路1) |
| 回测刷新 | 每周 | 样本外 CLV 监控(防 edge 衰减) |

**工程原则**:幂等(重跑不脏数据)、可重放(存输入快照)、无未来信息泄漏、每次预测存"特征+模型版本+赔率快照"(赛后才能算 CLV)。

---

## 4. 推送渠道与"合规措辞"

- 渠道:**Telegram / Discord / Web 看板**(Hermes 原生支持多渠道)
- 内容形态:**分析报告 + 概率 + value 信号 + 透明 CLV 战绩**
- ⚠️ 合规措辞(呼应 D7′):用"**概率 / 分析 / 研究 / 期望值**",**禁用**"稳赚 / 必中 / 包赢 / 跟单暴富";给的是"建议仓位(Kelly)"而非"代下注"
- 推送即分发:把"透明可验证战绩"做成增长资产(§04 杠杆5)

---

## 5. 成本控制(避免 OpenClaw 式账单)

1. **确定性优先**:能用代码算的绝不过 LLM
2. **LLM 仅两节点**:抽取(便宜模型,如小模型)+ 报告(可批量/可缓存)
3. **缓存**:同一比赛文本特征只抽一次;报告增量更新
4. **批处理**:多比赛合并请求
5. **预算护栏**:每日 token 上限 + 熔断(借鉴 Hermes 的 retry/session cap)
6. 估算:确定性流水线 token 成本≈0;LLM 抽取+报告 ~$0.05–0.30/场(§02)

---

## 6. 借鉴 Hermes 的 skill loop(守住量化内核)

- 把"如何分析 X 联赛 / X 情境"的**流程与配置**(清洗映射、特征配方、校准参数)沉淀为可复用 **skill**(agentskills.io 风格)
- 持久 **memory**:每联赛名称映射、特征有效性、已知坑、校准历史
- 越跑越快越强——但沉淀的是**流程/配置**,不是"概率"(呼应 D8)

---

## 7. 待你拍板

1. Agent 外壳:**直接用 Hermes**(MIT,自托管)/ OpenClaw / 先自建最小 cron 后接?
2. 量化能力对 Hermes 的暴露方式:**MCP 工具**(推荐,标准)/ CLI 脚本 / 两者?
3. 首发推送渠道:Telegram / Discord / Web 看板(可多选,起步选一)?
