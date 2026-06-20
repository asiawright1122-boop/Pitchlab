# PitchLab 决策记录(Decision Log)

> 持续更新。记录头脑风暴/调研中已**锁定**的决策,作为架构与路线规划的依据。
> 最近更新:2026-06-03

---

## 已锁定决策

### D1′. 商业定位 ✅(已按"作者不下注"重述)
- **核心定位:体育垂直的"自主 Agent + 量化研究"产品**(分析/研究端,**不下注**,类比量化交易研究端)
- **C(量化研究台/工具)+ B(研究信号订阅,透明 CLV 战绩背书)**
- **A(自营投注)彻底退场** → 仅内部 paper-trading(纸面跟单)验证信号质量,不投真金、不带客、不碰资金
- 详见 `research/05-reframe-quant-agent.md`

### D12′. Agent 运行时策略 ✅(复核修正:起步不用 Hermes)
- **Phase 0/1 完全自建轻量栈**(cron + 任务 + Postgres + 量化包 + 薄 LLM 封装),**不引入 Hermes**(其为通用助理平台,对本项目过重、成本不可控)
- **借鉴范式**:skill 文件 / MEMORY / cron / 多渠道——借模式,不背运行时
- **按需再挂**:等真需要"自主多渠道 / 自学习技能"时,把 Hermes 作为**可选外壳经 MCP 挂载**(Phase 5,非强求)
- 概率核心始终是确定性量化模型(LLM 不学概率)
- 详见 `research/08-design-and-path.md`

### D2. 验证路径 ✅
- **回测证伪 与 产品骨架 并行**
- 回测:用 football-data.co.uk 免费历史(含 Pinnacle 收盘)跑 CLV/EV
- 红线:若回测 **CLV < +2%** → 判定无 edge → 收敛为**纯工具/内容定位**,不硬做自营

### D3. 核心 KPI ✅
- 采用**博彩数学正确的盈利指标**:**CLV(收盘线价值)+ ROI/Yield + Brier 校准分**
- 准确率仅作辅助参考,不作为主 KPI
- 反馈层(第五层)按此重写

### D4. 数据源组合 ✅
- MVP 真实数据:**零成本三件套 + 1 锐盘源**
  - 赛程/结果:football-data.org(免费)
  - 历史结果 + 历史赔率(回测,含 Pinnacle 收盘):football-data.co.uk(免费)
  - 实时软盘:The Odds API(免费 500 credits)
  - xG:Understat(免费,Big5)
  - **锐盘 devig 基准:SportsGameOdds(免费含 Pinnacle,80+ 博彩商)** ✅
- Phase 1 开发:全部走 **mock + Adapter 接口**,真实源后接

### D5. 技术栈 ✅(大体认可,细节待定)
- TypeScript 全栈;Next.js 14 + Tailwind(看板);PostgreSQL + Prisma;独立 Agent worker + cron;LLM 抽象 Provider;数据源 Adapter 模式
- 待定:是否 monorepo vs 单一 Next.js(用户"有调整",细节未给)

### D6. 架构补强 ✅(源自盈亏分析)
- 五层架构需**补两层**才能闭环到"钱":
  - **投注策略层(Strategy)**:devig → +EV → value-bet 筛选
  - **资金管理层(Staking)**:Kelly 凯利下注量
- 即实际为"**七层**":原始 → 清洗 → 特征 → 预测 → **策略** → **资金管理** → 反馈/进化

### D7′. 合规定位 ✅(因"不下注"风险大幅下降)
- 定位**数据分析 / 量化研究 / Agent 产品**,**不碰资金、不代理下注**(无本金/账号/牌照风险)
- 仍**避免"保证盈利/稳赚/必中"话术**;措辞用"概率/分析/研究";面向合法市场
- 待定:具体目标市场/地区(待用户确认)

---

### D8. 概率引擎定位 ✅(关键转向)
- **LLM 不当概率引擎**;核心概率由**量化模型**产出
- **保留 LLM 在量化概率上做"有护栏的残差修正"**(有界 + 版本化 + 样本外 CLV 门槛 + 默认保守/自动熔断)
- LLM 真实进化贡献:①假设/特征发现 ②文本特征抽取 ③错误归因 ④有护栏微调

### D9. 主战场市场 ✅
- **1X2 + 亚盘 + 大小球 三者都要**
- 实现方式:用**双泊松/Dixon-Coles 比分分布引擎**一次性派生全部市场(几乎不增成本)

### D10. 概率引擎技术路线 ✅
- **两者集成**:先**统计模型(Dixon-Coles/双泊松)**起步,后加 **ML(GBM/XGBoost)**

### D11. 自我进化优先级 ✅(我定)
- **P0**:回测框架 + 校准(回路2)+ 滚动再训练(回路1)
- **P1**:特征 ROI 闭环(回路3)
- **P2**:Prompt A/B + LLM 假设生成/文本抽取(回路4)
- **P3**:LLM 有护栏残差修正(回路5,最后、需样本外证明 +CLV)

---

### D13. 多渠道推送 ✅(一等公民,自建)
- **多渠道订阅推送是核心功能**:用户扫码绑定 TG/Discord/微信,按联赛/市场订阅
- **自建多租户通知/订阅服务**(用户/绑定/偏好/去重/限流)——Hermes 是单用户助理,不适合面向 C 端推送
- 渠道现实:TG/Discord 容易;**微信需公众号/企业微信(个人微信无开放 API)**;邮件/Web Push 兜底
- 详见 `research/09-delivery-and-agent-build.md`

### D15. 服务架构 ✅
- **模块化单体(Modular Monolith)+ 独立 Worker**(非微服务)——资源占用小、迭代快、边界清晰可后续拆分
- **Agent 量化引擎 = 全局单例**(产出共享平台数据),非 per-user
- Web/API 与 Worker 进程分离(伸缩特性不同);共享 PostgreSQL(+可选 Redis 队列)
- 详见 `research/12-system-architecture.md`

### D16. 语言栈 ✅(修正 D5/D10 细节)
- **Web/API:TypeScript(Next.js)**
- **Worker/量化:Python**(Dixon-Coles/scipy/scikit-learn/xgboost 生态成熟)
- 两端用 **PostgreSQL 做契约**;Phase 0 真相机器纯 Python

### D17. 会员分层与多租户 ✅
- **Plan → Entitlements 权益映射 + API 中间件鉴权**
- **行级 user_id 隔离**(+ 可选 Postgres RLS);**B2B 白标(tenant_id/schema-per-tenant)后置**

### D14. 自建精简 Agent ✅
- **自己写"足球量化领域编排器"**(scheduler + task-graph + tool-registry + llm-nodes + skill-store + memory + run-log),不套用通用 agent 平台
- 90% 确定性流水线(可重放);LLM 仅 2–4 个有界节点
- 借鉴 Hermes 范式(skill/memory/cron)但不背其运行时

### D18. Phase 0 Go/No-Go ✅(2026-06-03 结案)
- **真相机器已跑通**;五大联赛 + 英冠 walk-forward 样本外 **CLV 均为负**(约 -6%～-9%),无一达到 **+2%** 闸门
- **No-Go**:主流联赛 1X2 value 自营信号 / 预测 alpha 主战线
- **Go**:定位 **C(量化研究台)+ B(透明研究内容)**;公开负 CLV 为信任资产,非失败遮羞
- **当前主工程**:Phase 1(Prisma/Worker/Web 管道);世界杯内容轨并行
- 详见 `research/14-phase0-go-nogo.md`

### D19. 产品形态锁定 ✅(2026-06-04)
- **形态**:出海英语大众市场的 **Telegram 原生 AI 看球 Agent + 虚拟钱包模拟盘**(C 工具 + B 内容的大众化外壳;底层引擎不变,前台去术语化)
- **价值主张**:从「帮你赢钱」→「更懂球 + 乐子 + 社交」(化解 Phase0 No-Go,**诚实 = 信任资产**)
- **合规红线(承重墙)**:虚拟币只送不卖+**不可交易** · 无现金/实物奖 · 强制 18+ · 不导流/不 affiliate(并 close 了 D7 市场待定 → 出海英语合法市场)
- **渠道**:Telegram 首发(弃 WhatsApp:Meta 默认禁博彩);Discord 次之
- **数据源**:The Odds API(ToS 最干净);锐盘 Pinnacle 需 SportsGameOdds Pro 档($299)— **修正 D4「免费含 Pinnacle」**
- **留存** = 触发 × 投入 × 绑定;核心差异化 = AI 人话解说 + **CLV 打分(赌徒→学员)** + 社交私密房 + 记忆
- **Agent** = 外壳(对话/语音 STT/记忆/技能),**内核确定性**(沿用 D14);进化锁死在「懂你」非「预测 alpha」
- **盈亏**:高毛利、低边际成本;命门 = 获客 × 转化(每 MAU LTV ~$1.3 → 只能自然获客);天花板 ~$1M/yr
- 详见 `brainstorm/01-im-agent-product-strategy.md`

### D19″. 数据资费与变现模式测算 ✅(2026-06-05)
- **前期极简方案 (0-1000 MAU)**：实现月度技术账单 $0。利用免费三件套（football-data.org 赛程、football-data.co.uk 免费历史 CSV 结算、The Odds API 免费 500 次/月），托管在 Vercel Free Tier，数据库用 Supabase Free Tier，定时用 GitHub Actions，LLM 用 Gemini 1.5 Flash 免费 API。95% 交互采用 Telegram 按钮卡片以缩减开发成本。
- **生产环境方案 (100k MAU)**：月度真实数据资费为 **$397/月**（SportsGameOdds Pro $299 + The Odds API 实时 $59 + API-Football $39），在混合变现（功能型 SaaS 订阅 + 激励视频广告）下，预测月净利可达 **+$16,771.32**，可轻松覆盖。
- **详见**：`research/16-independent-market-research.md` 与 `research/17-cost-minimization-plan.md`

### D20. 用户获取与裂变增长策略 ✅(2026-06-05)
- **冷启动期 (0 - 1000 MAU)**：完全零付费广告。通过在 Reddit (r/soccerbetting 等) 发帖邀请、寻找 Twitter/X 微型 KOL (500-5000 粉丝) 创房建联、前 1000 名新用户送 VIP 体验期以积累首批种子用户。
- **爆发自裂变期 (1k - 50k MAU)**：
  - **群管理员激励**：Bot 进群自动发盘口卡片，群友参与度高则送群管理员 VIP 会员天数。
  - **双向拉新返利**：邀请人和被邀请人双向赠送金币 + 好友观看视频广告金币返佣。
  - **Spotify Wrapped 裂变战报**：每周结算生成高逼格 CLV 眼光段位分享卡片。
- **长尾内容流量池 (50k - 500k MAU)**：通过 AI 自动生成前瞻分析，拦截 Google SEO 搜索词（如 "Arsenal vs Chelsea AI prediction"）长尾流量。
- **详见**：`research/18-user-acquisition-strategy.md`

### D21. TG Bot + TMA + Serverless 双轨融合架构 ✅(2026-06-05)
- **架构决策**：彻底放弃纯网站，避免过长的获客和裂变阻力漏斗（纯网页注册转化损耗大，Bot 模式群内一键卡片竞猜转化率高达 15%）。
- **双轨融合**：
  - **Agent 交互外壳 (TG Bot)**：负责高频交互、意图解析（文字/语音 STT 下注）、赛前 AI 吐槽/前瞻以及赛后调侃。
  - **富媒体 UI 网页 (Telegram Mini App)**：负责排行榜、私密房管理、类似“雪球/富途”的量化资产归因分析。
  - **无服务器事件驱动后端 (Vercel Serverless + Supabase + GitHub Actions)**：保证 90% 流程确定性，结算时计算 CLV 得分，数据不参与 AI 读写修改。
- **创意落地方案**：引入“AI现场即时弹幕吐槽”、“大神跟单交易员市场”、“每周足坛模因预言机”以及“90+绝杀时光保险”。
- **详见**：`research/19-system-architecture.md`、`research/20-competitive-differentiation.md`、`research/21-extra-creative-designs.md`、`research/22-agent-vs-website.md`

---

## 待确认 / 开放项

- [ ] monorepo vs 单一 Next.js 项目(D5 细节)
- [x] 目标市场/地区与合规边界(D7 细节)
- [x] 第一阶段交付物范围(已倾向:README + 架构/路线文档)
- [ ] Adapter 接口契约设计(用户:暂缓,谈完其他维度再定)
- [ ] 特征工程优先级(下一个待讨论维度)
- [ ] 反馈/进化的回测与归因机制细节
- [x] Agent 自动化(cron 节奏)与推送渠道

---

## 待讨论维度清单(头脑风暴 roadmap)

1. ✅ 数据源(免费/付费)— `research/01-data-sources.md`
2. ✅ 可行性 & 盈亏 — `research/02-feasibility-and-pnl.md`
3. ✅ 核心价值与差异化(护城河)— `research/07-moat-differentiation.md`
4. ⬜ 七层数据架构的 MVP 取舍
3.5 ✅ 重定位:量化研究台+自主Agent — `research/05-reframe-quant-agent.md`
7'. ✅ Agent 自动化与推送(含 Hermes 答疑)— `research/06-agent-automation.md`
4.1 ✅ 作战策略"怎么跑出来" — `research/04-winning-strategy.md`
5. ✅ 特征工程优先级 + Agent 架构 + 自我进化 — `research/03-features-and-agent.md`
6. ✅ 记忆与自我学习工程实现 — `research/10-memory-and-learning.md`
7. ✅ Agent 自动化与推送 — `research/06-agent-automation.md`
8. ✅ 合规与目标市场 — `research/11-compliance-and-market.md`
9. ✅ 多渠道推送 + 自建 Agent — `research/09-delivery-and-agent-build.md`
10. ✅ 设计总览(功能/优势/路径)— `research/08-design-and-path.md`

> 头脑风暴/调研维度已全部覆盖。Phase 0 已结案 → 见 `research/14-phase0-go-nogo.md`。下一步:Phase 1 产品骨架。
