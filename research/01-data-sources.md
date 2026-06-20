# PitchLab 数据源调研报告

> 维度:数据源(免费 / 付费对比)
> 调研时间:2026-05-29
> 状态:讨论中(边谈边记录)
> 关联架构:五层数据架构 → 主要服务于 **第一层(原始数据)** 与 **第五层(反馈/回测)**

---

## 0. 调研结论速览(TL;DR)

足球预测系统需要四类数据,**没有任何单一免费源能全包**,要按用途组合:

| 用途 | 首选(起步,省钱) | 升级(真实生产) |
|---|---|---|
| 赛程 / 比分 / 联赛表 | football-data.org(免费 12 大联赛) | API-Football Pro / Sportmonks |
| **历史结果 + 历史赔率(回测金矿)** | **football-data.co.uk(全免费 CSV)** | 同左,够用 |
| 实时盘口赔率 | The Odds API(免费 500 credits) | The Odds API 付费 / API-Football Ultra |
| xG / 高级数据 | Understat(免费,Big5)+ StatsBomb 开放数据 | Sportmonks(含 xG/Pressure Index) |
| 球员身价 / 转会 | Transfermarkt(免费,需爬) | 同左 |

**给 PitchLab 的建议**:Phase 1 全部走 **mock + Adapter 接口**;真正接真实数据时,**先接 football-data.co.uk(回测)+ football-data.org(赛程)+ The Odds API(盘口)** 三件套即可零成本跑通端到端,后续再按预算升级到 API-Football / Sportmonks。

---

## 1. 综合数据 API(赛程+球队+球员+统计,商业为主)

### 1.1 API-Football(api-sports.io)— 性价比之王
- **免费层**:100 请求/天,无需信用卡,永久免费;可访问所有端点,但**历史赛季受限、免费层无实时数据、仅 10 个联赛**
- **付费**(直连 dashboard,RapidAPI 价格略不同):
  - Pro $19/月:7,500 请求/天,全联赛 + 实时
  - Ultra $29–39/月:75,000 请求/天,**含盘口赔率(odds)**
  - Mega $39–99/月:150,000 请求/天,含深度球员统计
  - Custom:最高 150 万请求/天
- **覆盖**:1,100+ 联赛,更新最快 15 秒;含 Livescore / Lineups / Stats / **Pre-Match & Inplay Odds** / **Predictions**
- **限流**:最高 1000 请求/分钟(随套餐)
- **配额**:每日 00:00 UTC 重置
- 评价:**起步首选商业源**,$19 即可拿到全联赛实时;想要赔率上 Ultra

### 1.2 Sportmonks — 中端,自带 xG / 预测
- 2026.03 新定价,四档(功能一致,差异在联赛数量 + 调用量):
  - Starter €29/月:5 联赛,2,000 调用/小时
  - Growth €99/月(年付 €79):30 联赛
  - Pro €249/月(年付 €199):120 联赛
  - Enterprise:全联赛,定制
- **Odds 与 Historical 现已拆为付费 add-on**:
  - Odds & Predictions bundle €15–24/月:盘口 + AI 预测,50+ 博彩商,150+ 市场
  - Premium Odds Feed(TXODDS)起 €129/月:120+ 博彩商,开盘价 + 全程变盘,赛后保留 7 天
- 自有专有指标:**xG、Pressure Index、AI 预测**
- 14 天免费试用;年付 8 折
- 评价:**想要官方 xG + 预测**时值得;比 API-Football 贵

### 1.3 其他企业级(暂不考虑)
- Sportradar / Opta:官方数据,受监管环境默认,但价格极高、需销售流程
- TheStatsAPI / OddsMatrix / LSports:中高端,80–1196 联赛

---

## 2. 赛程 / 结果 / 联赛表(免费起步)

### 2.1 football-data.org — 免费层最干净
- **免费层(永久免费)**:12 大联赛(英超/西甲/德甲/意甲/法甲/欧冠/欧联/荷甲/葡超/英冠/巴甲/世界杯/欧洲杯),**10 调用/分钟**
- 免费层**只有**赛程、结果、积分榜,且**比分延迟、无球员数据、无统计、无实时**
- 付费:
  - Free w/ Livescores €12/月:实时比分,20 调用/分钟
  - Free + Deep Data €29/月:阵容、进球者、红黄牌、球员
  - ML Pack €29/月:历史最多 10 赛季
  - 更高 €49/99/199:更多联赛(30–全部)
  - Odds 与 Stats 为 €15/月 add-on
- 评价:**免费拿赛程/结果最省心**,但要球员/统计/赔率需付费

---

## 3. 盘口赔率(Odds)

### 3.1 The Odds API(the-odds-api.com)— 开发者最常用
- **免费**:500 credits/月(注意是 credit 不是请求)
  - 计费:每次 `/odds` 调用消耗 = `市场数 × 区域数` credits → 多市场会很快耗尽
  - 历史赔率端点为 10× credit
- 付费:$30/月 20K credits → $59/100K → $119/5M → $249/15M
- 覆盖:40+ 博彩商(均为 soft books,**无 Pinnacle 等 sharp books**);市场 h2h/spreads/totals/outrights
- 历史赔率:自 2020-06-06 起,5–10 分钟一快照
- 评价:**起步接盘口首选**(免费、文档好);但无 sharp book,严肃分析需考虑别家

### 3.2 其他赔率源
- **OddsPapi**:免费 250 请求/月,**含全部 350+ 博彩商(含 Pinnacle/Singbet sharp books)**,历史数据含;付费起 $49/月 → 数据/美元更划算
- **SportsGameOdds**:免费层(objects 计费),80+ 博彩商含 Pinnacle;付费 $99–499/月
- **OpticOdds**:企业级,无免费层,需销售

---

## 4. 历史回测金矿(强烈推荐,免费)

### 4.1 football-data.co.uk ⭐
- **全免费 CSV/Excel**,专为量化回测设计
- 覆盖:**31 赛季结果 + 26 赛季赔率 + 26 赛季比赛统计**,22 个欧洲联赛(11 国),最早回溯 1993/94
- 含:**1X2 赔率、亚盘、大小球**,来自 Bet365 / Pinnacle / William Hill 等 10 家;含**开盘价 + 收盘价(2019/20 起)**
- 每周二次更新(周日/周三晚)
- ⚠️ 注意:2025-07 起 Pinnacle 公开 API 不稳定,其赔率系统性滞后,已不再纳入平均/最大赔率计算
- 配套工具:Python `soccerdata` 库、GitHub `sosthene14/footballdataset`(一键下载 1993–2025)
- 评价:**反馈/回测层(第五层)的最佳免费数据**——有结果+赔率,可直接验证策略命中率

---

## 5. 高级数据(xG / 事件)

| 源 | 内容 | 获取 | 备注 |
|---|---|---|---|
| **Understat** | Big5 联赛 xG/xA/xGChain/PPDA、射门级 x/y 坐标 | 免费,易爬(`understat` py 库 / Apify) | 自有神经网模型,非 Opta,但够用;**xG 首选免费源** |
| **StatsBomb 开放数据** | 多赛事完整事件数据 + 360 定位数据 | 免费,GitHub + `statsbombpy` | 2026 公认最佳免费事件源,适合 portfolio/研究 |
| FBref | 历史聚合统计、xG/xA | 免费爬 | ⚠️ **2026-01 失去 Opta 授权**,不再更新当季高级数据,仅历史可用 |
| SofaScore | 射门 xG(Opta) | 难爬(反爬严格) | 数据好但工程成本高 |
| Transfermarkt | 球队/转会/**球员身价** | 免费爬 | 对应"球员身价/合同"特征 |

---

## 6. 映射到 PitchLab 五层架构

- **第一层(原始数据)**:赛程→football-data.org;球员→API-Football/Sportmonks 或 Transfermarkt;xG→Understat
- **第二层(清洗标准)**:多源球队/球员/联赛**名称映射**是刚需(同一队在不同源名称不同),时区统一,缺失降权
- **第三层(特征加工)**:ELO/状态评分自算;xG 来自 Understat;身价来自 Transfermarkt;战意需人工/规则补充
- **第四层(预测分析)**:数据喂给 LLM(抽象 Provider)
- **第五层(反馈进化)**:**football-data.co.uk 历史赔率 + 结果** 做回测命中率与错误归因

---

## 7. 成本分档建议

| 阶段 | 方案 | 月成本 |
|---|---|---|
| Phase 1 开发 | 全 mock + Adapter 接口 | $0 |
| MVP 真实数据 | football-data.co.uk(回测)+ football-data.org(赛程)+ The Odds API 免费(盘口)+ Understat(xG) | **$0** |
| 小规模生产 | API-Football Pro $19 + The Odds API $30 | ~$49 |
| 含 sharp 盘口 | + OddsPapi $49 或 SportsGameOdds $99 | ~$100–150 |
| 进阶(官方 xG/预测) | Sportmonks Growth €99 + Odds add-on €15 | ~€114 |

---

## 8. 待你拍板的决策点

1. **MVP 真实数据是否就用零成本三件套**(football-data.co.uk + football-data.org + The Odds API 免费)?
2. 盘口是否需要 **sharp books(Pinnacle)**?(影响选 The Odds API vs OddsPapi/SportsGameOdds)
3. xG 走 **Understat 免费爬** 还是直接上 **Sportmonks 官方**?
4. 是否需要先做一个 **Adapter 接口契约**(统一不同源的返回结构),为后续切换数据源解耦?
