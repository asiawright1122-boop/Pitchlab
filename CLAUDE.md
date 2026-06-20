# PitchLab Project Constitution (最高宪法)

## 核心原则 (Core Principles)

### 1. 数据真实性原则 (Data Authenticity Principle) - **最高宪法**
* **所有展示和存储的数据必须 100% 真实**。绝对禁止使用任何硬编码、seeded random（确定性随机模拟）或伪随机算法来生成赛事数据及球员个人数据（如射手榜、助攻榜、红黄牌等）。
* 所有前台看板、tg bot 和后台服务展示的射手、助攻、纪律统计数据，必须严格通过真实的足球 API（如 API-Football）获取并存储至数据库，进行真实性呈现。
* 如果接口或数据库字段暂时不支持，宁可留空或展示为“暂无数据/开发中”，也**绝不允许**使用 Mock 或算法模拟的虚假数据糊弄用户。

---

## 开发与验证规范 (Development & Verification)

### 常用命令 (Commands)
* **运行 Web 开发服务器**: `npm run dev:web`
* **运行数据库同步任务**: `npm run db:sync`
* **数据库迁移 (开发端)**: `npm run db:migrate:dev`
* **数据库生成**: `npm run db:generate`
* **执行数据 Seed (仅用于基础角色和配置初始化)**: `npm run db:seed`
* **测试 Bot 本地流**: `npx tsx scripts/test-bot-flow.ts` (在 `apps/web` 目录下执行)
* **测试 Bot AI 交互**: `npx tsx scripts/test-bot-gemini.ts` (在 `apps/web` 目录下执行)

### 临时数据与环境隔离规范
* 所有的测试脚本（包括 `test-bot-flow.ts`、`test-bot-gemini.ts` 等）在执行完毕后，必须在 `finally` 块中对数据库进行级联清理，将测试中生成的测试用户、钱包及测试订单完全擦除，严禁在主开发库中留存任何测试脏数据。
* 数据库 `seed.ts` 在执行初始化时，不得覆盖已有配置或在公共目录下重新生成 `metrics_history.json` 等带有 Mock 性质的文件，必须优先检测文件是否存在。
