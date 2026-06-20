# PitchLab 架构文档

> 基于 `research/` 调研与决策(见 `research/00-decisions.md`)的工程架构定稿。
> 版本:v0.1 · 2026-05-29

---

## 1. 设计原则

1. **量化内核确定性、可重放、可回测**——这是生命线;LLM 不参与算概率
2. **CLV 为核心 KPI**——一切以"是否跑赢收盘线"衡量
3. **轻起步**:模块化单体 + 独立 Worker,非微服务;不背通用 agent 运行时
4. **Agent 量化引擎 = 全局单例**;用户差异在会员分层 + 订阅
5. **复利护城河**:数据映射库 / 校准参数 / skill 库 / 战绩曲线 随时间增厚

---

## 2. 七层数据架构

| 层 | 名称 | 职责 | LLM? |
|---|---|---|---|
| L1 | 原始采集 | Adapter 多源拉数(赛程/赔率/xG/伤停) | 否 |
| L2 | 清洗标准 | 名称映射、时区、缺失处理、置信度标记 | 否 |
| L3 | 特征加工 | ELO/xG背离/伤停/战意/赛程 → 特征向量 | 文本抽取时是 |
| L4 | 概率引擎 | Dixon-Coles/双泊松(+ ML)+ 校准 → 比分分布 | **否(核心量化)** |
| L4.5 | 解释器 | 概率 + 特征 → 可读报告 | 是 |
| L5 | 投注策略 | devig → +EV → value-bet 筛选 | 否 |
| L6 | 资金管理 | Kelly 仓位**建议**(给用户,不执行) | 否 |
| L7 | 反馈进化 | 结算 → CLV/ROI/Brier → 归因 → 再训练 | 归因可选 |

> **比分分布引擎(L4)一次性派生全部市场**:1X2 / 亚盘 / 大小球 / BTTS / 比分 = 对比分矩阵不同求和。

---

## 3. 系统架构(模块化单体 + 独立 Worker)

```text
┌──────────────────────────────────────────────────────────┐
│  Web/API 服务 (TypeScript · Next.js)                       │
│   Auth · 订阅&计费(Entitlements) · 看板 · 渠道绑定         │
│   · 通知/订阅服务(多租户推送)                              │
├──────────────────────────────────────────────────────────┤
│  Agent/Worker 服务 (Python · 全局单例)                     │
│   精简编排器: scheduler + task-graph + tool-registry        │
│   量化流水线: L1→L7  +  真相机器(walk-forward 回测)        │
│   LLM 节点(有界): 文本抽取 / 报告 / (可选)假设·残差修正    │
├──────────────────────────────────────────────────────────┤
│  共享契约: PostgreSQL (Prisma schema)  ·  (可选)Redis 队列  │
└──────────────────────────────────────────────────────────┘
```

**进程划分理由:**
- Web/API:应对请求峰值,横向伸缩
- Worker:长任务/定时,独立伸缩,故障隔离
- 两者以 **PostgreSQL 为契约**(Worker 写预测/指标,Web 读)

**何时拆微服务:** 当某模块需独立伸缩/故障域时提取(实时赔率采集、LLM 抽取、通知发送)。先把模块边界画清,后续平滑拆分。

---

## 4. 自建精简编排器(Agent)

```text
scheduler     # cron / 定时触发(用成熟库,不自造调度内核)
task-graph    # L1→L7 的 DAG:幂等 + 重试 + 快照
tool-registry # 量化能力注册为可调用工具(可选暴露 MCP)
llm-nodes     # 文本抽取 / 报告(便宜模型 + 缓存 + 预算护栏)
skill-store   # 借鉴 Hermes:流程/配置存为可复用 skill(md/json)
memory        # 名称映射 / 特征有效性 / 校准历史(DB + 文件)
run-log       # 每次运行的输入快照 / 版本 / 产出(审计 + 重放)
```

**红线:** 不让 agent 做数学、不让每步过 LLM(成本失控)。Agent 调确定性脚本。

---

## 5. 记忆 与 自我学习

**记忆 4 层**:① DB 结构化主体(映射/模型/指标/快照/错题)② skill 文件 ③ FTS5 检索(后期向量)④ run-log。

**自学习 5 回路**(Champion/Challenger + 影子模式 + 样本外闸门):
- P0:滚动再训练(ELO 每场更新)+ 校准(isotonic/Platt)
- P1:特征 ROI 闭环(自动剔噪声因子)
- P2:LLM 假设生成 + Prompt/Skill A-B
- P3:LLM 有护栏残差修正

详见 `research/10-memory-and-learning.md`。

---

## 6. 数据模型(草案)

```text
-- 平台共享数据(全局,非用户隔离)
fixtures(id, league, home, away, kickoff_utc, status, score)
odds_snapshots(id, fixture_id, book, market, selection, price, taken_at)
predictions(id, fixture_id, model_version, market, selection, prob, created_at)
metrics(id, scope, clv, roi, brier, sample_n, computed_at)
models(version, params, calibration, trained_at)

-- 用户域数据(按 user_id 行级隔离)
users(id, email, ...)
plans(id, name, price, entitlements_json)
subscriptions(id, user_id, plan_id, status, period_end, provider_ref)
channel_bindings(id, user_id, channel, chat_id, verified_at)
user_topics(user_id, league_id|market, threshold)   -- 订阅项
paper_trades(id, user_id, fixture_id, selection, stake, price, result)
```

**多租户隔离:** 行级 `user_id` scoping(数据访问层统一注入)+ 可选 Postgres RLS;B2B 白标(tenant_id)后置。

---

## 7. 会员分层(Entitlements)

```text
Plan → entitlements_json → API 中间件统一鉴权(服务端,不信前端)

Free     公开战绩 / 1-2 联赛 / 延迟信号 / 无推送
Pro      全联赛 / 实时 value / devig+EV+Kelly 工具 / 多渠道推送
Premium  + 历史 CLV 深度 / 自定义筛选 / 提前推送窗口
API/B2B  程序化访问 / 配额 / SLA
```

---

## 8. 关键工程纪律

- **无未来信息泄漏**:特征只用"预测时点前"数据
- **快照存储**:每次预测存 特征 + 模型版本 + 赔率快照(赛后算 CLV)
- **幂等 + 可重放**:cron 重跑不产生脏数据
- **样本外验证**:walk-forward;CLV 闸门 ~200–500 注;盈亏 2000+ 注
- **成本护栏**:LLM 仅 2–4 节点 + 缓存 + 每日 token 上限熔断
