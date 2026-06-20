# Phase 6 规格: 可订阅 SaaS 提醒

> **状态**: Slice A 进行中 · **开始**: 2026-06-03  
> 调研: [`research/15-saas-alerts-product-research.md`](../research/15-saas-alerts-product-research.md)

---

## 1. 目标

足球概率 **订阅制 SaaS**：

1. 用户按联赛订阅 **开赛 / 赛果 / value 命中** 提醒
2. Pro + Telegram 绑定 → **个性化推送**（非仅 pipeline 摘要）
3. 用户 **策略规则** v1（min_edge、联赛）→ 与 value 提醒联动
4. 保留 **真实盘 + 虚拟 paper** 工作流

---

## 2. 数据模型

- `alert_subscriptions` — scope (`all` | `league`), kinds[], min_edge?
- `alert_deliveries` — dedupe_key 防重复发送
- `user_strategies` — rules JSON, notify flag

---

## 3. 验收标准 (Slice A)

- [x] Prisma 模型 + migrate
- [x] `GET/POST/DELETE /api/alerts`
- [x] `GET/POST/DELETE /api/strategies`
- [x] Dashboard System 页「我的提醒」UI
- [x] Worker `npm run alerts` — 扫描 fixtures + value artifact → Telegram
- [x] 接入 `pipeline.sh` 末尾
- [x] Free 3 条 / Pro 50 条 plan 门控

---

## 4. 提醒类型

| kind | 触发 |
|------|------|
| `kickoff` | 开赛前 55–65 分钟 |
| `result` | fixture status → finished |
| `value_hit` | value.json 中 edge ≥ min_edge（默认 2%）且 scope 匹配 |

---

## 5. 后续 (Slice B–D)

- 盘口变动 `odds_move`（OddsSnapshot diff）
- Pro Agent `/api/agent/chat` 只读 tools
- 赛前/收盘/赛后消息模板细化
