# 虚拟本金 · 量化研究沙盒

> **状态**: MVP · 与 D1′ 对齐（paper only，无真钱）

## 功能

- 登录即创建 **10,000 research_units** 虚拟钱包
- **1X2** 模拟单：下注扣余额，赛果结算后返还本金+盈利或亏损
- `db:sync` / pipeline 赛果回填后自动结算 open trades
- 看板 **Paper portfolio** Tab；可从 Value 一键「Paper 50u」

## API

| 路由 | 说明 |
|------|------|
| `GET /api/paper/wallet` | 余额、PnL、ROI |
| `GET /api/paper/trades` | 最近 50 笔（会先尝试结算） |
| `POST /api/paper/trades` | 下单（¼-Kelly 上限校验，可传 `model_prob`） |
| `GET /api/paper/leaderboard` | 匿名排行榜（SHA256 前 8 位，按 settled ROI） |

## 合规

- 文案：模拟研究、不可提现、非投注建议
- 不与 Stripe 钱包混用

## 后续

- ~~联赛 fixture 从 `/matches` 下单~~ ✅ 1X2 · ¼-Kelly · 模型公平赔率
- ~~Kelly 上限、排行榜（匿名）~~ ✅ `maxPaperStake` + `GET /api/paper/leaderboard`
- ~~与公开 `/record` 对照~~ ✅ Paper portfolio「You vs public /record」
