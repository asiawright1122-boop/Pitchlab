# 2026世界杯比赛赔率一览页面复刻设计文档

本文档定义了在 PitchLab 项目中复刻 `wc-2026.com` 世界杯即时赔率页面的具体设计与规范。

## 1. 目标与视觉规范
- **目标**：以 1:1 的数据结构与交互机制（含完赛折叠、升降箭头、投注链接等）复刻 `https://wc-2026.com/all-matches-odds/`，并将该功能整合在 Web Dashboard 中。
- **视觉风格**：采用 PitchLab 的 **玻璃拟态深色设计风格**，与现有的积分榜、预测界面配色保持完美一致，不再使用原站白底的 WordPress 传统样式。

## 2. 路由与架构设计

### 2.1 新增路由
- **路由路径**：`apps/web/app/[sport]/league/[leagueId]/odds/page.tsx`
- **主要逻辑**：
  ```tsx
  "use client";
  import { useParams } from "next/navigation";
  import { Dashboard } from "@/components/Dashboard";

  export default function LeagueOddsPage() {
    const params = useParams();
    const sport = params.sport as string;
    const leagueId = params.leagueId as string;

    return <Dashboard sport={sport} leagueId={leagueId} initialTab="odds" />;
  }
  ```

### 2.2 Dashboard 组件集成
修改 `apps/web/components/Dashboard.tsx`：
- **新增 Tab 选项**：在 `Tab` 类型中增加 `"odds"`。
- **配置 Tab**：在 `tabs` 数组中添加 `"odds"`：
  ```typescript
  { id: "odds", label: "即时赔率", show: leagueId === "wc2026" || leagueId === "WC" }
  ```
- **挂载渲染**：当 `tab === "odds"` 时挂载 `<OddsTableView leagueId={leagueId} />`。

---

## 3. 数据层与 API 设计

### 3.1 数据库源 (Prisma)
赔率页面数据依赖 `Fixture` 和 `OddsSnapshot` 两个模型：
- **Prisma 查询逻辑**：
  ```typescript
  const fixtures = await prisma.fixture.findMany({
    where: { league: leagueId },
    orderBy: { kickoffUtc: "asc" },
    include: {
      oddsSnapshots: {
        where: { book: "pinnacle", market: "1x2" },
        orderBy: { takenAt: "asc" }
      }
    }
  });
  ```

### 3.2 双重数据容灾保障
为保证即使在无数据库连接（如开发测试或离线部署）的情况下页面仍可访问，数据拉取增加文件 Fallback：
1. **优先读取 PostgreSQL 数据库**。
2. **Fallback 文件读取**：当数据库不可用时，自动从 `public/data/fixtures.json` 和 `public/data/odds_snapshots.json` 读取数据。

---

## 4. 前端组件 `OddsTableView` 设计
新建组件 `apps/web/components/OddsTableView.tsx`。

### 4.1 已完赛折叠交互
- 提取数据中的 `status === "finished"` 赛事。
- 按日期（北京时间）对已完赛比赛进行分组（如 `6月12日`）。
- 渲染为一个可点击折叠的表头行：`＋ 已完赛 · {date} · {count}场`。点击该行会切换该日期下所有已完赛场次的 `display` 状态。

### 4.2 赔率趋势箭头逻辑
针对每场比赛的 1X2 赔率，如果 `oddsSnapshots` 存在多条记录：
- **最新赔率**：取最后一条快照的 `price` 值。
- **赔率变动**：对比最新快照与第一条（基准）快照的赔率价格差。
  - 若 `latestPrice > initialPrice`，显示红色的 `↑`。
  - 若 `latestPrice < initialPrice`，显示绿色的 `↓`。
  - 若无变化或仅有一条快照，则不显示箭头。

### 4.3 其它字段复刻
- **投注链接**：表格中的 "🔗" 跳转链接，外链至指定的投注页面。
- **阶段快捷链接**：点击阶段名称（如 "A组"）时，触发状态修改，快捷切换至积分榜（Standings）对应的 A组积分榜区域。

---

## 5. 验证与测试用例
1. **路由验证**：直接访问 `/soccer/league/wc2026/odds` 应当能正确加载 Dashboard 且高亮“即时赔率” Tab。
2. **容灾验证**：关停数据库连接后，页面仍能依赖本地 JSON 文件正常渲染出赛事及赔率。
3. **折叠验证**：点击“已完赛”表头，列表能顺畅展开/折叠，已完赛的比赛初始状态为折叠隐藏。
4. **趋势箭头验证**：比对 odds_snapshots 的前后价格，箭头升降标记准确。
