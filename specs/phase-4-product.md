# Phase 4 规格:产品化 (C+B)

> **状态**: MVP 完成 · **开始**: 2026-06-03

---

## 1. 目标

在「不下注、透明研究台」定位下，提供：

1. **用户账号** + 会话（邮箱登录，本地开发可用）
2. **Plan → Entitlements** 服务端鉴权
3. **Free / Pro** 两档（Premium/API 后置）
4. 推送绑定表结构（Telegram/Discord 占位，不接真实 Bot）

---

## 2. 验收标准

- [x] Prisma：`users`, `plans`, `subscriptions`, `channel_bindings`
- [x] `npm run db:seed` 写入 Free / Pro 方案
- [x] `/login` + `/api/auth/*` 会话
- [x] `lib/entitlements.ts` + Pro 功能门控（Value、League model）
- [x] `/pricing` 档位说明
- [x] System 页推送绑定 UI（Pro，`/api/channels/bind`）
- [x] 公开战绩页 `/record`（可分享，无需登录）
- [x] 虚拟本金模拟盘（`paper_wallets` / `paper_trades`）— 见 [`phase-4-paper.md`](phase-4-paper.md)
- [x] Stripe Checkout + webhook 骨架（需配置 env）
- [x] `npm run notify` — Telegram 推送（需 `TELEGRAM_BOT_TOKEN` + Pro 绑定）

---

## 3. 档位 (MVP)

| Plan | entitlements |
|------|----------------|
| **free** | 公开战绩、Leagues/Track、世界杯展示 |
| **pro** | + Value、League model、全联赛监控、推送绑定（表就绪） |
