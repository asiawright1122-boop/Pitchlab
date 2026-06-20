# 2026-06-10-dashboard-redesign-design

## 1. 目标与背景

当前 PitchLab 后台的“个人管理”选项卡（`PersonalHub.tsx`）存在以下几个核心问题：
1. **角色功能混杂**：普通用户的设置（Telegram 绑定、通知订阅、量化策略配置）和管理员的运维工具（数据同步、Hermes Pipeline 任务状态监控）混杂在同一个页面。
2. **表格密度过大**：`DataSyncPanel` 里的 `Published artifacts` 表格直接罗列了近 20 行键值，占用了大量垂直空间，且破坏了页面的“呼吸感”。
3. **术语生涩晦涩**：界面中充斥着普通用户难以理解的学术/技术术语（如 `Dixon-Coles`, `Edge %`, `RU Ledger`, `Artifacts`, `Pipeline`），严重降低了用户体验的亲和力。

本方案旨在推倒旧有排版，采用 **“UI UX PRO MAX”** 的设计理念进行全面重构，让页面视觉大气、重点突出、信息呈现符合直觉。

---

## 2. 详细重构设计

### A. 导航架构拆分
在顶级仪表盘的 Tab 菜单（[Dashboard.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/Dashboard.tsx)）中，彻底剥离管理员与普通用户的功能：
- **“个人管理” (Personal Hub)**：面向所有登录用户，仅保留：
  - 用户余额与订阅状态卡片
  - Telegram 推送绑定卡片
  - 量化警报订阅规则配置
  - 超额优势策略配置
- **“系统运维” (System Admin)**（**新增**）：仅对管理员（`me.isAdmin` 为 `true`）在顶级 Tab 栏中可见。将原先的 `DataSyncPanel` 和 `SystemStatus` 移动到这里。

### B. 普通用户界面去术语化（Term Simplification）
将生涩学术/技术词汇翻译为大白话：
- `Edge %` $\rightarrow$ **“胜率优势 / 偏离幅度”** (在设置时引导说明：“当模型预测优势大于该数值时，将向您推送消息”)
- `RU Ledger / Balance` $\rightarrow$ **“测试筹码 / 模拟额度”** (并在资产卡片中清晰展示)
- `Dixon-Coles Engine` $\rightarrow$ **“量化预测核心 / 胜率分析引擎”** (移除 Dixon-Coles 算法缩写)
- `Published Artifacts` $\rightarrow$ **“系统数据包”** (管理员后台)
- `Hermes Pipeline` $\rightarrow$ **“数据自动化计算流”** (管理员后台)

### C. “卡片 + 侧边详情抽屉” 交互重构 (System Admin Tab)
将管理员的 [DataSyncPanel.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/DataSyncPanel.tsx) 和 [SystemStatus.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/SystemStatus.tsx) 进行视觉重构：
- 数据同步栏不再直接渲染大表格，而是以**简洁状态卡片网格**呈现。
- 在“系统数据包”状态卡片上点击时，从屏幕右侧平滑滑出一个 **详情抽屉 (Drawer Panel)**，在抽屉中渲染 `Artifacts` 的详细同步历史列表（Key, Synced, Source）。

### D. UI 视觉升级（UI UX PRO MAX）
- **磨砂玻璃质感 (Glassmorphism)**：使用 Tailwind 的 `backdrop-blur`、半透明背景和细微的高光边框（`border-white/5`），实现高端、富有呼吸感的卡片层级。
- **微动效与交互反馈**：卡片悬浮时具有 `hover:translate-y-[-2px]` 和 `hover:border-white/20`，配上流畅的 Tab 切换过渡动画（`animate-fade-up`）。
- **色彩规范**：严格使用统一的高端渐变和中性深灰配色，不使用刺眼高饱和度的纯红纯蓝，用符合情绪的渐变蓝与翡翠绿作点缀。

---

## 3. 受影响的文件与组件

1. **[Dashboard.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/Dashboard.tsx)**:
   - 更新 `Tab` 类型，增加 `"system_admin"`。
   - 过滤 tabs 列表，确保 `"system_admin"` 仅在管理员（`me.isAdmin`）时渲染。
   - 在 Tab 选择渲染区添加 `<SystemAdmin />`（新组件）的分支。

2. **[SystemAdmin.tsx](file:///NewComponent)** (新增组件):
   - 包含管理员专属运维控制。
   - 渲染 [DataSyncPanel.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/DataSyncPanel.tsx) 与 [SystemStatus.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/SystemStatus.tsx)。

3. **[PersonalHub.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/PersonalHub.tsx)**:
   - 移除管理员专属的数据同步和系统状态监控的逻辑与渲染代码。
   - 全面精简普通用户卡片：重写去术语化文案，将 `Edge` 改为 `优势比例/胜率优势`，`Balance` 细化为 `模拟额度筹码`。
   - 优化卡片布局与美感，提供毛玻璃和渐变点缀。

4. **[DataSyncPanel.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/DataSyncPanel.tsx)**:
   - 移除内置的硬编码 20 行大表格渲染。
   - 新增 Drawer（抽屉）状态管理，点击卡片后滑出显示表格。
   - 简化术语为“系统数据包”。

5. **[SystemStatus.tsx](file:///Users/kaka/Dev/Oobs/PitchLab/apps/web/components/SystemStatus.tsx)**:
   - 精简化文案术语（如“Hermes Pipeline”翻译为“数据自动计算流”）。

---

## 4. 验证与测试方案

### 自动化测试
- 运行 `npm run build` 确保 TypeScript 类型编译无误。
- 运行 `npm run lint` 保证代码风格与规则通过。

### 手动验证
- 登录普通用户，确认看不到“系统运维” Tab，且“个人管理”页面的词汇通俗易懂，界面宽敞且有呼吸感。
- 登录管理员，验证“系统运维” Tab 可见，包含预测引擎状态，且“数据同步”卡片点击时能在右侧平滑拉出包含 artifacts 明细的 Drawer。
