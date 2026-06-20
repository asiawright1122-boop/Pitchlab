# PitchLab 路线规划

> 版本:v0.2 · 2026-06-03 · 基于 `research/00-decisions.md` · Phase 0 结案见 `research/14-phase0-go-nogo.md`

---

## 决策摘要(已锁定)

| # | 决策 | 结论 |
|---|---|---|
| D1′ | 定位 | 体育垂直"量化研究台 + 自主 Agent",**不下注**;C(工具)+ B(战绩内容);A 退为内部纸面验证 |
| D2 | 验证路径 | 回测证伪 ∥ 产品骨架;CLV<+2% 转纯工具 |
| D3 | KPI | **CLV + ROI + Brier 校准**(准确率仅辅助) |
| D4 | 数据源 | football-data.co.uk + .org + The Odds API + Understat + **SportsGameOdds**(锐盘);Phase1 全 mock |
| D6 | 架构层 | **七层**(补投注策略层 + 资金管理层) |
| D8 | 概率引擎 | LLM 不当概率引擎;保留有护栏残差修正 |
| D9 | 市场 | 1X2+亚盘+大小球,由一个比分分布引擎派生 |
| D10/D16 | 引擎/语言 | 先统计后 ML;**Web=TS,Worker/量化=Python** |
| D11 | 自进化 | P0 校准+再训练 → P1 特征 → P2 Prompt/Skill → P3 残差修正 |
| D12′ | Agent 运行时 | 起步自建轻量,不用 Hermes;借范式,按需挂载 |
| D13 | 推送 | 自建多租户通知服务(TG/Discord/微信公众号) |
| D14 | Agent | 自建精简领域编排器 |
| D15 | 服务架构 | 模块化单体 + 独立 Worker(非微服务) |
| D17 | 会员/租户 | Plan→Entitlements + 行级 user_id 隔离;B2B 后置 |
| D7′ | 合规 | 数据分析定位;支付通道是主关卡;英语合法市场优先 |

---

## 分阶段路线

### Phase 0 · 真相机器 ✅ **已结案 (2026-06-03)**
**目标**:用免费历史数据(含 Pinnacle 收盘)测出样本外 CLV,回答"有没有 edge"。
- ✅ football-data.co.uk 下载器 + mock 数据
- ✅ Dixon-Coles/双泊松概率引擎 + 全市场派生
- ✅ devig + CLV/Brier/ROI 指标 + walk-forward harness + CLI + 45 tests
- **Go/No-Go 结论**:五大联赛+英冠 1X2 value **均无样本外 +CLV**(约 -6%～-9%) → **No-Go 自营信号**; **Go 工具 C + 内容 B**
- 报告:[`research/14-phase0-go-nogo.md`](../research/14-phase0-go-nogo.md)

### Phase 1 · 轻量骨架 + 数据模型 ✅
- ✅ monorepo `apps/web` + `apps/worker` + 根 `prisma/`
- ✅ PostgreSQL + Prisma（`published_artifacts`、`pipeline_runs`）
- ✅ Worker `db:sync` + Web `/api/artifacts/[key]`（静态 JSON fallback）
- ✅ `scripts/pipeline.sh` + `docs/phase-1-ops.md`
- ✅ `/matches` 列表页 + `/api/health`
- ✅ `pitchlab fixtures` 导出 + worker 写入 `fixtures` 表 + `/api/fixtures`
- ⬜ football-data.org `--live` 定时拉取（需 `FOOTBALL_DATA_TOKEN`）
- 规格:[`specs/phase-1-skeleton.md`](../specs/phase-1-skeleton.md)

### Phase 2 · 概率引擎 + 校准 + 策略层 ✅
- ✅ 联赛 Elo (`pitchlab/league/elo.py`)
- ✅ `pitchlab league export` → `league_elo` / `league_predictions` / `metrics_monitor` JSON
- ✅ Dixon-Coles hold-out + Brier/ECE/log-loss 监控 + value/Kelly 提示（分析用）
- ✅ Web「League model」Tab
- ✅ 五大联赛 `league export --all` + `league_bundle.json`（真实 CSV 已验证）
- ⬜ 特征库扩展 · football-data.org 未来赛程
- 规格:[`specs/phase-2-engine.md`](../specs/phase-2-engine.md)

### Phase 3 · 反馈进化 + 自动化 ✅
- ✅ `pitchlab feedback snapshot` → `feedback_snapshot.json` + `metrics_history.json`
- ✅ pipeline 末尾自动 snapshot · Web **Feedback** Tab
- ✅ Champion/Challenger **记录**（回测 CLV vs hold-out Brier，协议不同仅看趋势）
- ⬜ 预测快照入库 · 滚动再训练产线 · 影子模式自动切换
- 规格:[`specs/phase-3-feedback.md`](../specs/phase-3-feedback.md)

### Phase 4 · 产品化 C+B **MVP ✅**
- ✅ Prisma users/plans/subscriptions/channel_bindings
- ✅ 邮箱登录 + iron-session + `/pricing`
- ✅ Pro 门控：Value、League model；System 页推送绑定 stub
- ✅ 公开战绩落地页 [`/record`](../apps/web/app/record/page.tsx)
- ✅ 基础合规文案（`ComplianceNotice`）+ `sitemap` / `robots`
- ✅ 年龄门（`AgeGate` localStorage）
- ⬜ Stripe 计费 · 真实 Telegram Bot · 地理限制
- 规格:[`specs/phase-4-product.md`](../specs/phase-4-product.md) · 运维:[`phase-4-ops.md`](phase-4-ops.md)

### Phase 5 ·(可选)增强
- LLM 假设生成(回路4)+ 有护栏残差修正(回路5)
- 特征 ROI 闭环(回路3)
- 按需挂载 Hermes/OpenClaw 作运营助理(非 C 端推送)
- ML 集成(GBM/XGBoost)

---

## 并行说明
Phase 0(真相机器)与 Phase 1(骨架)可并行——骨架不依赖 edge 结论,且 C 定位下骨架始终有用。

---

## 成功概率提醒(诚实)
- 技术闭环 🟢 高 · 某 niche +CLV 🟡 中 · C+B 有受众 🟡 中(取决于 niche+分发)
- 下行可控:即使无 edge,"诚实的分析工具"依然成立
- 详见 `research/04-winning-strategy.md`
