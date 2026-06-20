# Phase 1 规格:轻量骨架 + 数据模型

> **状态**: 基本完成（DB 同步需本地 Postgres）· **开始**: 2026-06-03  
> **前置**: Phase 0 结案 → [`research/14-phase0-go-nogo.md`](../research/14-phase0-go-nogo.md)

---

## 1. 目标

建立 **引擎 JSON → PostgreSQL → Next.js API → 看板** 的最小可重复管道，不依赖 edge 结论。

---

## 2. 验收标准

- [x] Prisma schema（`published_artifacts`、`pipeline_runs`；`fixtures`/`predictions` 占位）
- [x] Docker Compose 本地 Postgres
- [x] Worker `npm run db:sync` 将 `apps/web/public/data/*.json` 幂等写入 DB
- [x] Web `GET /api/artifacts/[key]` 读 DB；客户端 fallback 静态 JSON
- [x] 定时 cron：`scripts/pipeline.sh` + [`docs/phase-1-ops.md`](../docs/phase-1-ops.md)
- [x] 比赛列表页：`/matches`（导出预测表格；live fixtures 表 Phase 2）
- [x] `GET /api/health`、`GET /api/artifacts`（运维元数据）

---

## 3. 仓库布局

```text
prisma/schema.prisma          # 共享契约
docker-compose.yml            # 本地 Postgres
apps/worker/src/sync.ts       # JSON → DB
apps/web/app/api/artifacts/   # DB → API
```

---

## 4. 本地启动

```bash
# 1) 依赖
cp .env.example .env
cp .env apps/web/.env.local   # Next.js 读 DATABASE_URL
npm install
npm run db:generate

# 2) 数据库
npm run db:up
npm run db:migrate

# 3) 数据（已有 public/data 或先跑引擎导出）
npm run db:sync

# 4) 看板
npm run dev:web   # /matches · /api/health

# 可选：一键管道
npm run pipeline
```

运维详见 [`docs/phase-1-ops.md`](../docs/phase-1-ops.md)。

---

## 5. 后续（Phase 1 余下 / Phase 2）

- `pitchlab agent` 完成后自动触发 sync（webhook 或 cron）
- Fixtures 从 football-data.org 入库，Web 比赛列表
- 用户域表（users / subscriptions）— Phase 4
