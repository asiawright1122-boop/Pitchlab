# Phase 1 运维说明

## 前置

1. 复制环境变量：`cp .env.example .env` 且 `cp .env apps/web/.env.local`
2. 启动 Postgres：`npm run db:up`（需 **Docker Desktop 运行中**）

> **端口**：本仓库 Compose 映射 **`localhost:5434`**（避免与本机已有 `5432` 冲突）。`DATABASE_URL` 须与之一致。
3. 迁移：`npm run db:migrate`
4. 安装依赖：`npm install`（含 `postinstall` → `prisma generate`）

## 一次性 / 手动管道

```bash
# 全管道（导出 + 同步）
chmod +x scripts/pipeline.sh
./scripts/pipeline.sh

# 或分步
cd engine && . .venv/bin/activate
pitchlab worldcup --export-json ../apps/web/public/data --sims 10000
npm run db:sync
npm run dev:web
```

## 定时任务 (cron)

```cron
# 每天 06:00 UTC
0 6 * * * cd /path/to/PitchLab && ./scripts/pipeline.sh >> /path/to/PitchLab/logs/pipeline.log 2>&1
```

环境变量（可选）：

| 变量 | 默认 | 说明 |
|------|------|------|
| `DATABASE_URL` | — | 未设置则只写静态 JSON |
| `DATA_DIR` | `apps/web/public/data` | 导出目录 |
| `SIMS` | `10000` | 世界杯蒙特卡洛次数 |
| `BACKTEST_SOURCE` | `mock` | `mock` 或 `football-data` |
| `FOOTBALL_DATA_TOKEN` | — | 设置后 `npm run fixtures:live` 或 pipeline 自动拉取 |
| `LEAGUE_SOURCE` | 有缓存则 `football-data` | Phase 2 联赛导出 |
| `LEAGUE_SEASONS` | `2021 2022 2023 2024` | `league export --all` |

真实联赛批量（需 `engine/.cache/*.csv`）：

```bash
./scripts/export-leagues-real.sh
```

## 健康检查

- `GET /api/health` — DB 连通性与已同步 artifact 数量
- `GET /api/artifacts` — 各 key 的 `syncedAt` 元数据

## Docker 未启动时

看板仍可通过 `public/data/*.json` 工作（`fetchArtifact` 自动 fallback）。  
要启用 API/DB 路径：启动 Docker Desktop → `npm run db:up` → `npm run db:migrate` → `npm run db:sync`。

`db:sync` 会同步 JSON artifacts，并把联赛/世界杯 **1X2 预测** 写入 `predictions` 表（Phase 3）。  
验证：`GET /api/predictions?limit=20` · `/api/health` 中的 `predictionCount`。

### 自动赛果回填（Phase 3）

```bash
# 拉取五大联赛最新赛季赛果（用 .cache CSV，无缓存则自动下载）
pitchlab settle --seasons 2024 2025 --export-json apps/web/public/data
```

已接入 `scripts/pipeline.sh`（有 `engine/.cache/E0_*.csv` 时自动跑）。`db:sync` 会把 `settlements.json` 写入 Postgres `fixtures` 表。

## 远程 Postgres

将 `DATABASE_URL` 指向托管实例即可，无需本地 Docker；仍执行 `npm run db:migrate` 与 `npm run db:sync`。
