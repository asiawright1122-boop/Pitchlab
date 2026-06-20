# PitchLab 生产部署清单 (Production Checklist)

本手册将指引您如何将 PitchLab 从本地完美迁移到公网生产环境。由于我们的系统设计非常现代化，整个生产部署流程**完全无需您自己管理服务器**。

## 架构选型 (零服务器运维方案)
1. **数据库 (Postgres)**: [Supabase](https://supabase.com/) 或 [Neon](https://neon.tech/) (免费版足够支撑初期流量)
2. **定时任务 (Python 量化引擎)**: GitHub Actions (每日凌晨自动唤醒执行)
3. **Web 看板前端 (Next.js)**: [Vercel](https://vercel.com/) (无缝支持 Next.js)

---

## 步骤一：配置云端数据库
1. 在 Supabase 或 Neon 上创建一个新的 PostgreSQL 数据库。
2. 拿到您的生产级 `DATABASE_URL`（通常以 `postgres://` 或者 `postgresql://` 开头）。
3. 在本地运行命令将数据库结构推送到云端：
   ```bash
   cd apps/web
   DATABASE_URL="您的线上链接" npx prisma migrate deploy
   ```

## 步骤二：配置 GitHub Actions (引擎调度)
PitchLab 的核心数据和分析引擎不需要24小时运行，仅需每天更新。
我已经为您生成了自动执行的脚本：`.github/workflows/daily_pipeline.yml`。

**操作**：
进入您托管代码的 GitHub 仓库的 `Settings` -> `Secrets and variables` -> `Actions`。
新建以下 **Repository secrets**：
- `DATABASE_URL` (填入步骤一的数据库链接)
- `TELEGRAM_BOT_TOKEN` (如果有报警机器人的话填入)
- `FOOTBALL_DATA_TOKEN` (足球数据源 API 密钥)

配置好后，Github 会在每天 UTC 时间早上 4:00 (北京时间中午 12:00) 自动为您拉取数据、执行策略回测，并将赔率预警等推送到数据库或 Telegram。

## 步骤三：上线 Vercel (Web 看板)
1. 登录 [Vercel](https://vercel.com/)，选择 `Add New Project`。
2. 关联您的 PitchLab GitHub 仓库。
3. **关键配置**：
   - **Framework Preset**: 选择 `Next.js`
   - **Root Directory**: 点击 Edit，选择 `apps/web`
   - **Build Command**: 覆盖为 `cd ../.. && npm install && npm run build -w pitchlab-web`
4. **Environment Variables (环境变量)**：
   在 Vercel 部署页面的 Environment Variables 部分添加：
   - `DATABASE_URL`: 同步骤一
   - `SESSION_SECRET`: 随便敲一长串随机英文字母/数字（至少 32 位），用于加密用户 Cookie
   - `NEXT_PUBLIC_SITE_URL`: 您的实际上线域名（比如 `https://pitchlab.app`）
   - `STRIPE_SECRET_KEY`: （若启用付费）您的 Stripe 生产环境密钥
   - `STRIPE_WEBHOOK_SECRET`: Stripe 的 Webhook 密钥
   - `AI_API_KEY`: 供 Pro Agent 使用的大模型 Key（比如 OpenAI 或 Groq）
   - `AI_BASE_URL`: （可选）如果您用 NVIDIA NIM 或者代理地址
5. 点击 **Deploy**！

---

## 步骤四：生产环境验收 (Smoke Testing)
等待 Vercel 部署绿灯后，请依次访问线上地址测试以下核心流：
- [ ] 访问 `https://你的域名/api/health` 检查数据库连接状态
- [ ] 注册一个账号，并尝试体验 Pro 功能。
- [ ] 测试是否能在 Telegram 正常接收到 Odds Alerts 推送。
- [ ] 测试内置的 Agent 对话助手。

🎉 **恭喜，您的 PitchLab 已经正式成为公网上运转的专业工具平台！**
