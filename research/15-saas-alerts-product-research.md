# PitchLab #15: 可订阅 SaaS 产品调研

> 维度: 用户愿景落地 · 竞品 · 能力差距 · MVP 切片  
> 时间: 2026-06-03  
> 触发: Lokcursor —「工具服务 SaaS、赛事提醒、盘口/赛果推送、Pro Agent 互动、用户策略、真实盘+虚拟盘」

---

## 1. 目标产品（用户原话归纳）

| 模块 | 用户期望 |
|------|----------|
| **形态** | 订阅制 **SaaS**（非一次性工具、非 tipster 信号包） |
| **数据** | **真实盘口** → 概率与 value 计算依据 |
| **资金** | **虚拟钱包盘**（paper）验证想法，不代下注 |
| **订阅** | 按联赛/球队/场次/规则订阅 **赛事提醒** |
| **推送** | 赛果、盘口变动、符合策略的 value 触达（Telegram 等） |
| **策略** | 用户自定义阈值（CLV、联赛、Kelly 等），驱动提醒与 paper |
| **Agent** | Pro 用户与 Agent **互动**（解释、查持仓、策略命中），非远期概念 |
| **进化** | 平台侧模型 shadow/晋升闭环；用户侧是「我的策略 + 提醒」 |

**一句话定位（调研结论）**  
> **足球垂直的概率 SaaS**：真实 sharp 线做 devig/value，虚拟盘跟单实验，可配置策略与 Telegram 提醒；平台 Agent 负责研究管线与用户问答，**不卖「跟我下」**。

这与 Phase 0 No-Go（无自营 1X2 edge）一致：**卖工作流与概率基础设施**，不卖 alpha 承诺。

---

## 2. 竞品地图（按能力轴）

### 2.1 足球概率 + 策略 + 回测（最接近 Footixify）

| 产品 | 定价 | 核心 | 提醒/推送 | 虚拟盘 | Agent/AI |
|------|------|------|-----------|--------|----------|
| **[Footixify](https://www.footixify.com/)** | Free + **€4.99/mo** Premium | ML 概率、fair odds、EV、Kelly、**5 条 saved strategies**、策略回测、赔率变动 | 未强调 Telegram；站内 board | 回测/资金曲线模拟 | AI match previews |
| **PitchLab（目标）** | Free/Pro（待定价） | DC/Elo + devig + CLV 纪律、联赛 hold-out | **Telegram + 订阅规则（待建）** | ✅ paper + ¼-Kelly + 榜 | pipeline Agent + **对话（待建）** |

**启示**  
- Footixify 已验证 **「概率板 + 市场对比 + 用户策略 + Kelly」** 可 €5 级订阅。  
- PitchLab 差异化不应是「更诚实」，而是 **sharp 线 CLV 工程 + 多联赛监控 + 推送 + 平台 Agent 管线透明**。  
- Footixify 弱在：推送、实盘级延迟、自治 agent 运维叙事。

### 2.2 赔率/价值提醒 SaaS（全体育，足球可切）

| 产品 | 定价 | 延迟 | 推送 | 策略/规则 |
|------|------|------|------|-----------|
| **[OddsNotifier](https://oddsnotifier.io/)** | ~£25–50/mo | **~120ms** dropping odds | Telegram | 多 feed、EV 自动算、联赛 preset |
| **[OddAlerts Funnel](https://www.oddalerts.com/funnel)** | Pro | ~5–10s 滚球扫描 | Telegram | **用户自定义** 市场、赔率涨幅%、统计条件 |
| **[OddSlice](https://oddslice.com/)** | $49–199/mo | ~30s 扫描 | TG + Email + Webhook | 阈值、PM vs book |
| **[SharpEdge](https://sharpedgeai.app/)** | Free–$49/mo | ~7min 全扫 | Telegram + Kelly 注码 | AI 文案模式；偏「给一单」 |
| **OddsJam** | ~$39+/mo | ~5s | Web/Push | +EV、套利、多书 |

**启示**  
- **提醒是成熟付费点**：用户买的是「不用盯盘」。  
- 赢家共性：**Telegram + 可配置规则 + EV/盘口变化**。  
- PitchLab 若只做足球，应做 **「赛前 value / 收盘线 CLV / 赛果」** 三类模板，不必拼 120ms 全体育（成本极高）。  
- **OddAlerts Funnel** 与用户需求最接近：**自定义规则 → 24/7 扫描 → TG**。

### 2.3 策略构建 + Smart Alerts（美式为主）

| 产品 | 定价 | 策略 | 提醒 |
|------|------|------|------|
| **[Rithmm](https://www.rithmm.com/)** | ~$30/mo | No-code 模型权重、回测、**Smart Signals**（历史模式命中才推） | App 内 |
| **Footixify** | €4.99/mo | Saved strategies + backtest | 弱 |

**启示**  
- **「用户策略」** 在市面上 = saved filters + backtest + **命中时推送**（Rithmm Smart Signals）。  
- PitchLab 可用更简单 v1：**JSON 规则**（min_clv、leagues、markets）+ 与 `paper_trades` 联动，不必先做 no-code 滑块。

### 2.4 量化研究台（非提醒导向）

| 产品 | 差异 |
|------|------|
| **Unabated** | 专业 devig、CLV 教育、偏美式盘口 |
| **Juice Reel** | 社交/榜单型 |
| **POD Tools** | 免费 Pinnacle 工具，无 SaaS 订阅深度 |

PitchLab 不应与 Unabated 拼书商数量，应拼 **足球联赛深度 + 可编程 artifact 管线 + paper 社区榜**。

---

## 3. PitchLab 现状 vs 愿景（差距表）

| 愿景能力 | 已有 | 缺口 | 估工作量 |
|----------|------|------|----------|
| 真实盘口 | `OddsSnapshot`、devig、value、Pinnacle 语义 | 多书商、盘中刷新频率、变动检测 | M |
| 虚拟盘 | `paper_*`、Kelly、`/matches` 一键 paper、匿名榜 | 与用户策略绑定、组合 PnL 报表 | S |
| 赛事列表 | `/matches`、`fixtures` API、live status 脚本 | 用户级「关注列表」 | S |
| 推送通道 | TG 绑定、`notify` pipeline 摘要 | **按订阅/策略** 的个性化消息 | M |
| 赛事订阅 | 架构草案 `user_subscriptions_topics` | **表 + UI + worker 匹配** | M |
| 用户策略 | 引擎侧 monitor.strategy 文案 | `user_strategies` 表 + 评估器 | M |
| Pro Agent 对话 | `feedback_snapshot.agent` 状态 | `/api/agent/chat` + tools（fixtures/paper/strategy） | L |
| 平台 Agent 进化 | shadow、GBM、promotion gates、weekly | 自动 promote 写生产、Hermes 级自主 | L（持续） |
| 计费 SaaS | Stripe 骨架、entitlements | 按提醒数/联赛数分档 | S |

**S/M/L**：约 1–2 周 / 3–4 周 / 6+ 周（单人 agent 开发量级，非精确排期）。

---

## 4. 定位建议（调研结论）

### 4.1 对外一句话

**「足球概率订阅台：真实收盘线算 value，虚拟盘试策略，Telegram 按你的规则提醒。」**

### 4.2 不要主打

- ❌ 公开负 CLV / 「诚实 tipster」  
- ❌ 与 OddsNotifier 比毫秒延迟、250 书商  
- ❌ 「已完全自治的 Hermes」（未交付）

### 4.3 应主打（可演示）

- ✅ devig + model vs market + 联赛 hold-out（Dashboard）  
- ✅ Paper + ¼-Kelly + 匿名榜（社交证明，非战绩吹牛）  
- ✅ Telegram 绑定（已有）→ **下一步：我的联赛/value 提醒**  
- ✅ Shadow 模型 / weekly digest（Agent 管线可见）  
- ✅ `/record` = 默认模型审计附录（B 路径已改文案）

### 4.4 定价锚点（竞品参照）

| 档位 | 参考 | PitchLab 建议 |
|------|------|----------------|
| 入门 | Footixify €4.99 | Free：有限联赛 + 5 条提醒/日 + 1 策略 |
| 主力 | Rithmm $30、OddAlerts Pro | Pro：**无限策略 + TG 提醒 + Value + Agent 问答** $19–39/mo |
| 高阶 | OddSlice API $199 | 后置：API 导出概率、webhook |

---

## 5. MVP 落地切片（与 `research/12-system-architecture.md` 对齐）

### Slice A — 提醒订阅（最先变现感知）

```text
alert_subscriptions(
  id, user_id,
  scope_type: league | team | fixture,
  scope_id,
  kinds: kickoff | result | odds_move | value_hit,
  channels: telegram,
  min_clv?, leagues?, active
)
```

- Worker: `fixtures:live` + odds diff → 匹配 → `sendTelegram`  
- Web: System 页「我的提醒」CRUD  
- Entitlement: free 3 条 / pro 无限

### Slice B — 用户策略 v1

```text
user_strategies(
  id, user_id, name,
  rules_json: { min_clv, leagues[], markets[], kelly_cap },
  notify: boolean,
  paper_auto: boolean  // 可选：仅建议 stake，不自动下单
)
```

- 评估器：每场 pipeline 后跑一遍 → 命中则推送 + 可选高亮在 `/matches`  
- 与现有 `paper-bet.ts` Kelly 上限共用

### Slice C — Agent 互动 v1（Pro）

- 只读 tools：`list_fixtures`, `get_value_row`, `paper_summary`, `shadow_status`, `get_strategy`  
- 不做写库自动化；回答「这场 model prob vs close？」「我策略今天几条？」  
- UI：System 或 Dashboard 侧边 chat 抽屉

### Slice D — 盘口推送文案模板

1. **赛前**：开赛 T-60 + 当前 1X2 vs model  
2. **收盘**：Pinnacle close vs 你的 model（CLV 预览）  
3. **赛后**：赛果 + 若 paper 有单则结算摘要  

---

## 6. 与旧调研文档的修订建议

| 文档 | 问题 | 建议 |
|------|------|------|
| `07-moat-differentiation.md` | 仍以「透明 CLV 战绩」为第一护城河 | 降为 **工程纪律**；第一护城河改为 **「足球概率 SaaS 工作流」**（策略+提醒+paper） |
| `05-reframe-quant-agent.md` | C+B 并列 | B 改为 **weekly/SEO 附录**；主叙事 **C SaaS** |
| `12-system-architecture.md` | 已有 `user_subscriptions_topics` 草案 | 实现为 `alert_subscriptions` + `user_strategies` |

---

## 7. 待拍板（给用户）

1. **提醒优先级**：先做 `value_hit` + `result`，还是 `odds_move`？（决定数据源频率投入）  
2. **Agent v1**：仅 Telegram 命令（`/today` `/paper`）还是 Web chat？  
3. **定价**：对齐 Footixify（低 ARPU 走量）还是 OddAlerts（规则提醒溢价）？  
4. **是否写进 roadmap 为 Phase 6**：`specs/phase-6-saas-alerts.md`

---

## 8. 参考链接

- Footixify: https://www.footixify.com/pricing  
- OddAlerts Funnel: https://www.oddalerts.com/funnel  
- OddsNotifier: https://oddsnotifier.io/en/products/dropping-odds-alerts  
- Rithmm Smart Signals: https://www.rithmm.com/  
- OddSlice: https://oddslice.com/  
- 内部: `research/12-system-architecture.md`, `specs/phase-4-product.md`, `specs/phase-4-paper.md`
