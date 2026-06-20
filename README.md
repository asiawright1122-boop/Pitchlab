# PitchLab ⚽📊

> **足球量化研究工具** —— walk-forward 回测、devig、模型 vs 市场 value、联赛监控与 paper 实验。**可回测、不下注、不售信号。**

PitchLab 是**研究/分析端**（非博彩执行端）：帮你相对 Pinnacle 收盘线算 CLV、筛 +EV、跑 Dixon-Coles/Elo 管线。Phase 0 已证伪默认 1X2 模型在五大联赛无样本外 edge —— [`/record`](http://localhost:3000/record) 仅是**方法论附录**，不是订阅理由。

---

## 核心理念(必读)

1. **准确率 ≠ 盈利**。1X2 随机基准 33%,无脑押热门 ≈ 50%+;真正的盈利指标是 **CLV(收盘线价值)**——是否持续跑赢 Pinnacle 收盘线。
2. **LLM 不当概率引擎**。概率由可校准、可回测的**量化模型**(Dixon-Coles/双泊松 + ELO + xG)产出;LLM 只做"理解数据(文本特征抽取)+ 表达分析(报告)"。
3. **卖能力,不卖诚实口号**。价值在 devig/回测 harness/value 筛选/paper,不在「敢公开负 CLV」叙事。
4. **先证伪,再投入**。Phase 0 已结案:主流联赛 1X2 **无 +2% CLV** → 产品锁定**工具 C**,不硬做 tipster/B。详见 [`research/14-phase0-go-nogo.md`](research/14-phase0-go-nogo.md)。
5. **不下注 → 风险可控**。无本金/账号/牌照风险;最坏情况是"一个有用的分析工具",而非血本无归。

---

## 七层架构

```text
L1 原始采集 → L2 清洗标准 → L3 特征加工 → L4 概率引擎(+校准)
   → L4.5 LLM 解释 → L5 投注策略(devig→EV→value)
   → L6 资金管理(Kelly 建议) → L7 反馈进化(结算→CLV/ROI/Brier→再训练)
```
贯穿:**真相机器**(walk-forward 回测,样本外 CLV)

---

## 技术栈

| 层面 | 选型 |
|---|---|
| Web/API + 看板 | TypeScript · Next.js · Tailwind |
| Worker / 量化引擎 | **Python**(Dixon-Coles/scipy/scikit-learn/xgboost) |
| 数据库 | PostgreSQL + Prisma(契约) |
| 调度 | 自建精简编排器(cron + 任务图) |
| 数据源 | football-data.co.uk(回测,含 Pinnacle)· football-data.org(赛程)· The Odds API(软盘)· SportsGameOdds(锐盘 devig 基准)· Understat(xG) |
| 推送 | 自建多租户通知服务(Telegram/Discord/微信公众号) |

> 架构:**模块化单体 + 独立 Worker**(非微服务);Agent 量化引擎为**全局单例**,用户差异在会员分层与订阅。

---

## 愿景对照

单页说明「Hermes 式自主 Agent」愿景 vs 当前实现 vs Phase 5 最小闭环：[`docs/vision-vs-reality.md`](docs/vision-vs-reality.md)

## 仓库结构

```text
pitchlab/
├── README.md
├── prisma/          # PostgreSQL 契约 (Phase 1)
├── docker-compose.yml
├── docs/            # 架构 / 路线 / 设计文档
├── specs/           # 各阶段规格 (phase-0, phase-1, …)
├── research/        # 调研与决策(00 决策 + 01–13 + **14 Phase0 结案**)
├── brainstorm/      # 头脑风暴
├── engine/          # 量化引擎(Python):真相机器 + 世界杯模块
└── apps/
    ├── web/         # Next.js 看板 + /api/artifacts
    └── worker/      # JSON → Postgres 同步
```

## Web 看板 + Phase 1 数据管道

```bash
# 0) 根目录: Postgres + Prisma + sync
cp .env.example .env && cp .env apps/web/.env.local
npm install && npm run db:generate
npm run db:up && npm run db:migrate

# 1) 引擎导出 JSON
cd engine && . .venv/bin/activate
pitchlab worldcup --export-json ../apps/web/public/data --sims 20000
pitchlab backtest --source mock --export-json ../apps/web/public/data/backtest.json
cd .. && npm run db:sync

# 2) 看板 (API 优先，无 DB 时 fallback 静态 JSON)
npm run db:seed   # Phase 4: Free / Pro plans
npm run dev:web   # http://localhost:3000
# /login — 邮箱登录；本地可勾选 Dev Pro 解锁 Value / League model
```

详见 [`specs/phase-1-skeleton.md`](specs/phase-1-skeleton.md)。看板含 **Value（devig/+EV）**、联赛 hold-out 监控、世界杯预测、paper 盘；System 页可配置 **赛事提醒**（Telegram，`npm run alerts`）；[`/record`](http://localhost:3000/record) 为可分享的回测附录。Phase 6 见 [`specs/phase-6-saas-alerts.md`](specs/phase-6-saas-alerts.md)。

---

## 路线(Phase)

| 阶段 | 内容 | 闸门 |
|---|---|---|
| **Phase 0** ✅ | 真相机器:回测 + Dixon-Coles + CLV | **已结案:无 edge** → [14-go-nogo](research/14-phase0-go-nogo.md) |
| **Phase 1** ✅ | 轻量骨架 + Prisma + Worker + Web | 引擎→DB→看板 |
| **Phase 2** ✅ | 联赛 Elo + DC 监控 + 策略提示 | [`specs/phase-2-engine.md`](specs/phase-2-engine.md) |
| **Phase 3** ✅ | 反馈快照 + settle/CLV + Feedback Tab | [`specs/phase-3-feedback.md`](specs/phase-3-feedback.md) |
| **Phase 4** ✅ MVP | 登录/档位/Pro 门控 + 推送绑定占位 | [`specs/phase-4-product.md`](specs/phase-4-product.md) · [`docs/phase-4-ops.md`](docs/phase-4-ops.md) |
| Phase 5 ⚡ | 影子模型 champion/challenger | [`specs/phase-5-enhancement.md`](specs/phase-5-enhancement.md) |

详见 [`docs/roadmap.md`](docs/roadmap.md) · 当前状态 [`docs/STATUS.md`](docs/STATUS.md) · 架构见 [`docs/architecture.md`](docs/architecture.md)

---

## 快速开始(Phase 0 真相机器)

```bash
cd engine
python -m venv .venv && source .venv/bin/activate
pip install -e .

# 用内置 mock 数据跑一遍回测(无需联网)
pitchlab backtest --source mock

# 用真实历史数据(联网下载 football-data.co.uk)
pitchlab download --league E0 --seasons 2021 2022 2023
pitchlab backtest --source football-data --league E0

# Phase 2: 联赛 Elo + hold-out 监控导出
pitchlab league export --league E0 --seasons 2022 2023 2024 --source mock --export-json ../apps/web/public/data
```

---

## ⚠️ 合规声明

PitchLab 是**体育数据分析 / 概率建模工具**,**不提供投注、不代理资金、不保证盈利**。所有输出仅供信息与研究参考。请遵守所在地法律,理性对待。详见 [`research/11-compliance-and-market.md`](research/11-compliance-and-market.md)。
