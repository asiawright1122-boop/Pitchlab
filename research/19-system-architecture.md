# PitchLab 完整系统架构设计报告

*Generated: 2026-06-05 | Focus: 双轨融合架构、Serverless部署与数据流设计*

---

## 1. 整体系统架构图 (System Architecture)

基于极简、零成本冷启动的原则，我们设计了 **“Telegram Bot (Agent 交互) + Telegram Mini App (Web UI) + Serverless / Event-Driven 后端”** 的融合架构。以下为系统核心架构图：

```mermaid
graph TB
    subgraph 1. 交互与展示层 (Frontend)
        TGChat["Telegram 聊天 & 群组<br>(一键卡片竞猜/Bot 播报)"]
        TGApp["Telegram Mini App<br>(富媒体网页 UI: 排行榜/私密房/球员市场)"]
    end

    subgraph 2. 逻辑与网关层 (Backend API Gateway)
        Vercel["Vercel Serverless (API 网关 & TS)<br>承接 TG Webhook 与 Mini App API"]
        GHAction["GitHub Actions (定时 Worker)<br>定时采集赔率/爬取赛果/结算"]
    end

    subgraph 3. 确定性内核与数据层 (Core Engine & DB)
        DB[(Supabase Postgres)<br>存储用户本金/投注记录/球队与赔率]
        DC_Engine["量化内核 (Dixon-Coles & Elo)<br>Devig / CLV 结算算法 / 模拟盘机制"]
    end

    subgraph 4. 智能代理与 AI 编排 (Agent & LLM)
        Gemini["Google AI Studio (Gemini 1.5 Flash)<br>生成人话预测/弹幕吐槽/意图解析"]
        Memory["用户长期记忆与偏好库<br>(基于 Supabase Row-level)"]
    end

    subgraph 5. 外部数据源 (Data Sources)
        OddsAPI["The Odds API<br>(实时软盘水位)"]
        FootDataOrg["football-data.org<br>(赛程与实时赛果)"]
        FootDataUK["football-data.co.uk<br>(免费历史数据 / Pinnacle 锐盘收盘线)"]
    end

    %% 数据与事件流动关系
    TGChat -- "1. 消息/按钮交互 (Webhook)" --> Vercel
    TGApp -- "2. 渲染请求" --> Vercel
    Vercel -- "3. 读写数据" --> DB
    Vercel -- "4. 意图解析 & 聊天" --> Gemini
    GHAction -- "5. 定时数据同步" --> DB
    GHAction -- "6. 调用外部 API" --> OddsAPI
    GHAction -- "6. 调用外部 API" --> FootDataOrg
    GHAction -- "7. 下载 CSV 并批量结算" --> FootDataUK
    DC_Engine -- "内嵌运行" --> Vercel
    DC_Engine -- "内嵌运行" --> GHAction
    Gemini -- "读写记忆" --> Memory
```

---

## 2. 极简开发栈配置 ($0 MVP Tech Stack)

| 架构层 | 选型 | 费用 | 职责说明 |
| :--- | :--- | :--- | :--- |
| **前端外壳** | **Telegram Bot SDK** | **$0** | 负责群组和私聊交互，分发结构化卡片与行内按钮（Inline Keyboards）。 |
| **前端网页** | **Telegram Mini App (TMA)** | **$0** | 纯静态 SPA 网页（基于 Vite + React + Vanilla CSS 极致设计），托管于 Vercel 免费版，在 TG 内部拉起，免去跳出摩擦。 |
| **API 网关** | **Vercel Serverless (Node.js/TS)** | **$0** | 采用无服务器架构，接收 Telegram Webhook 消息和 Mini App 数据请求，执行下注和查询逻辑。 |
| **数据库** | **Supabase Free Tier (PostgreSQL)** | **$0** | 500MB 免费空间。存储 `users`（金币余额）、`bets`（投注记录）、`matches`（赛程与比分）、`odds`（赛前赔率与收盘赔率）等表。 |
| **定时任务** | **GitHub Actions** | **$0** | 每天定时启动运行 Python 脚本：更新赔率、更新比分、下载历史 CSV、执行模拟盘金币结算和 CLV 计算。 |
| **AI 引擎** | **Gemini 1.5 Flash Free API** | **$0** | 用于开放式球迷问答、赛前人话前瞻生成和赛中 AI 现场弹幕解说。 |

---

## 3. 核心数据流逻辑设计 (Data Flow)

### 3.1 “赛前赔率同步”数据流
1.  **触发**：GitHub Action 每 6 小时自动触发一次。
2.  **获取**：调用 `The Odds API`，拉取未来 24 小时内主流联赛（英超、西甲等）的 1X2 软盘赔率。
3.  **写入**：将赔率信息、开赛时间及球队对照写入 Supabase 的 `odds` 和 `matches` 表中。

### 3.2 “用户群内卡片投注”数据流
1.  **触发**：用户在 TG 群内点击 Bot 发送的投注卡片按钮（如“曼联 胜 [2.10]”）。
2.  **网关路由**：Telegram Server 将点击事件作为 Webhook POST 请求发送到 Vercel Serverless。
3.  **逻辑处理**：
    - Vercel 检查该用户在 Supabase 中的虚拟金币余额是否足够。
    - 若足够，在 `bets` 表中插入一条投注记录，并在 `users` 表中扣除金币，返回下注成功卡片（整个过程耗时 < 100ms）。
    - 若不足，提示破产，并附带“观看激励视频补给 500 金币”的按钮链接。

### 3.3 “赛后 CLV 与财富榜结算”数据流
1.  **触发**：每周三和周日晚上 23:00 UTC，GitHub Action 定时触发。
2.  **数据拉取**：脚本从 `football-data.co.uk` 自动下载最新的比分和收盘赔率 CSV 文件。
3.  **批量结算（量化内核）**：
    - 脚本遍历数据库中未结算的投注（`bets` 表）。
    - 用真实比分结算赢亏，更新 `users` 金币余额。
    - **CLV 计算**：读取投注时的赔率（$Odds_{bet}$）与终场收盘去抽水赔率（$Odds_{close\_fair}$），计算当前单子的 CLV：
      $$\text{CLV} = \frac{Odds_{bet}}{Odds_{close\_fair}} - 1$$
    - 更新用户的累积 CLV 分数。
4.  **广播**：Vercel 网关调用 Telegram API，自动向对应的球迷群聊中推送“本周财富排行榜”和“本周赌神/穷光蛋称号”播报。
