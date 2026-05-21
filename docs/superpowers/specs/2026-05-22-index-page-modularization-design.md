# Index Page Modularization Design

**Date:** 2026-05-22

## Goal

在不改变现有部署方式的前提下，将 `src/pages/Index.tsx` 从单文件总控页逐步拆分为可继续演进的模块结构，使后续功能接入优先落在独立模块内，而不是继续堆叠到 `Index.tsx`。

## Current State

- `src/pages/Index.tsx` 约 `10527` 行，承担了导航、状态、数据加载、Cloudflare API 调用、页面渲染、对话框控制和大量内联事件处理。
- 当前 lint 债务集中在 `Index.tsx`，主要是 `@typescript-eslint/no-explicit-any` 和少量 `react-hooks/exhaustive-deps`。
- 现有仓库已经有一批独立表单与面板组件，说明“按功能拆出组件”符合当前代码风格。
- GitHub Actions 当前只会在 `push main` 时构建并发布 GitHub Pages，未配置 Worker 或 D1 自动部署。

## Non-Goals

- 本轮不追求一次性将全仓 lint 清零。
- 本轮不引入新的状态管理库。
- 本轮不改动 Cloudflare Worker、D1、GitHub Pages 的部署流程。
- 本轮不进行大范围视觉改版。

## Constraints

- 默认工作流为“功能分支开发，合并到 `main` 才触发 Pages 发布”。
- 允许少量内部整理，以换取后续更快的扩展性。
- 重构应优先保持已有行为稳定，尤其避免无界扩大副作用链路变更。
- 新拆出的模块必须以明确类型边界为目标，避免把 `any` 原样扩散到新文件。

## Design Summary

采用“视图分治 + 局部副作用下沉”的方案。

`Index.tsx` 在重构后的职责应收敛为：

- 顶层布局与导航切换
- 跨视图共享的基础状态
- 少量跨视图协调逻辑
- 组合各功能模块

每个大视图模块负责：

- 自己的展示结构
- 自己的局部事件处理
- 自己的派生数据计算
- 能够明确下沉的 `load*` 逻辑与类型定义

不在第一阶段处理的内容：

- 账号恢复与凭据迁移总流程
- 全局 toast 封装策略
- 所有 API 调用的统一 SDK 化

## Target Structure

建议逐步引入以下结构：

```text
src/
  components/
    index-page/
      analytics/
        AnalyticsView.tsx
        analytics-types.ts
        analytics-utils.ts
      page-rules/
        PageRulesView.tsx
        page-rule-types.ts
      kv-storage/
        KvStorageView.tsx
        kv-storage-types.ts
      pages/
        PagesView.tsx
        pages-types.ts
      tunnels/
        TunnelsView.tsx
      certificates/
        CertificatesView.tsx
      shared/
        index-page-types.ts
        formatters.ts
  pages/
    Index.tsx
```

命名重点：

- 先沿用 `components` 目录，不额外引入 `features` 目录层级，降低迁移阻力。
- 视图专属类型优先放在各自目录内；跨视图复用类型再提到 `shared`。
- `Index.tsx` 不再新增大段内联视图 JSX。

## Module Boundaries

### 1. Analytics

来源区块：`activeView === "analytics"`

拆出后模块职责：

- 接收 `analyticsData`、`analyticsPeriod`、`selectedZone`
- 承担图表、聚合统计、列表和格式化逻辑
- 下沉 analytics 相关的派生计算与辅助函数

优先原因：

- `any` 最集中
- 多为展示和聚合计算，适合先做类型化
- 对其它视图依赖较弱

### 2. Pages

来源区块：`activeView === "pages"`

拆出后模块职责：

- 接收项目列表、项目详情、部署列表、选择状态
- 管理 Pages 视图内部交互
- 下沉 Pages 相关类型与渲染判断

优先原因：

- 区块独立，后续新功能较可能继续接入
- 存在较多列表渲染和 `any`，适合收紧类型

### 3. KV Storage

来源区块：`activeView === "kv-storage"`

拆出后模块职责：

- 管理命名空间列表、键列表、批量选择、导入导出 UI
- 吸收 KV 专属事件处理函数
- 逐步移除 `any[]`、`catch (e: any)` 和匿名行类型

风险说明：

- 内联异步事件较多
- 需要先稳定 props 接口再迁移

### 4. Page Rules

来源区块：`activeView === "page-rules"`

拆出后模块职责：

- 承载规则列表、表单状态映射、开关和编辑逻辑
- 将规则对象、动作对象、表单对象类型显式化

风险说明：

- 存在动作映射与编辑态回填
- 适合在 Analytics 与 Pages 之后进行

### 5. Certificates / Tunnels / D1 / R2

这些区块可按“独立视图优先、共享状态最少优先”的原则继续迁移。

建议顺序：

1. `certificates`
2. `tunnels`
3. `d1-database`
4. `r2-storage`

## Shared State Strategy

第一阶段保留在 `Index.tsx` 的状态：

- 认证与账号相关状态
- `zones`、`selectedZone`、`workers`、`selectedWorker`
- 顶层 `activeView`
- 全局弹窗开关与跨视图共享选择态

允许逐步下沉的状态：

- 仅由单个视图消费的列表状态
- 单视图内临时编辑状态
- 单视图的过滤、排序、展示切换状态

判定规则：

- 如果一个状态只在一个视图区块使用，就应优先考虑迁移到该视图组件。
- 如果一个状态需要驱动顶部导航或多个视图联动，就继续保留在 `Index.tsx`。

## Side-Effect Strategy

当前 `Index.tsx` 的主要风险不在 JSX 体积本身，而在副作用和加载函数耦合。

处理顺序：

1. 先拆“渲染与派生计算”
2. 再拆“局部事件处理”
3. 最后处理 `useEffect` 与 `load*` 依赖

这样可以避免在第一阶段同时改动：

- 视图结构
- 数据加载时机
- 状态归属

`useEffect` 相关 warning 不应在第一批迁移中顺手大改，除非该 effect 已经完全归属到拆出的单一视图。

## Lint Strategy

本次重构不以“一次性 lint 清零”为目标，而以“避免债务继续扩散”为目标。

执行规则：

- 新建模块文件必须 lint 干净。
- 迁移到新模块的代码要顺手消化所在区块的 `any`。
- 未迁移的旧区块允许保留历史债务，但不允许新增新的大块 `any`。
- `Index.tsx` 每次迁移后都应减少体积、减少内联 JSX、减少该区块对应的 lint 报错。

## Branch and Release Workflow

- 所有模块化工作在功能分支进行。
- 功能分支允许频繁提交与局部验证。
- 只有合并到 `main` 才会触发 GitHub Pages 自动构建发布。
- 重构阶段不绑定 Cloudflare Worker 或 D1 自动部署动作。

这意味着：

- 文档、重构、局部 lint 收敛可以安全并行推进。
- 即便前端结构持续调整，也不会因为普通分支 push 自动覆盖线上 Pages。

## Rollout Phases

### Phase 1: Presentation-First Split

目标：

- 拆出 `analytics`、`pages` 两个优先视图
- 把主要图表、卡片、表格渲染从 `Index.tsx` 中移走
- 为后续扩展建立目录和 props 边界

完成标志：

- `Index.tsx` 不再直接承载这两个大视图的完整 JSX
- 这两个模块文件 lint 干净

### Phase 2: Interaction-Heavy Views

目标：

- 迁移 `kv-storage`、`page-rules`
- 吸收对应的局部事件处理和局部类型

完成标志：

- 相关 `any` 显著下降
- 视图级操作不再散落在 `Index.tsx` 的大段内联 JSX 中

### Phase 3: Secondary Views

目标：

- 迁移 `certificates`、`tunnels`、`d1-database`、`r2-storage`
- 将剩余独立视图区块移出

完成标志：

- `Index.tsx` 主要保留导航、共享状态和组合逻辑

### Phase 4: Effect and Loader Cleanup

目标：

- 重新整理 `load*` 系列函数归属
- 修复可安全归位的 hook 依赖 warning
- 明确哪些数据加载仍由顶层控制，哪些由子视图控制

完成标志：

- 顶层副作用更少
- 后续接入新功能时优先在模块内完成，而不是回流到 `Index.tsx`

## Risk Controls

低风险动作：

- 抽纯展示组件
- 抽格式化函数和统计计算函数
- 补列表项、图表项、表格行的显式类型
- 收紧 props 类型

中风险动作：

- 下沉局部异步事件处理
- 调整视图内部状态归属
- 局部修正 `useEffect` 依赖

高风险动作：

- 重新设计认证恢复逻辑
- 重排 zone / worker 总加载链路
- 在同一批次同时迁移视图和副作用入口

执行要求：

- 每一批改动只动一个主视图或一类副作用。
- 避免跨两个以上高耦合区块同时迁移。
- 每次迁移都要保持分支内可构建、可 lint、可手工点通核心路径。

## Verification

每一阶段完成后至少验证：

- `npm run build`
- 相关模块的 `npx eslint`
- 相关视图的手工点击流程

核心人工回归路径：

- 登录并恢复账号
- 选择 Zone
- 切换到对应视图
- 执行该视图最核心的一条写操作或读操作

## Expected Outcome

完成这条路线后：

- 新功能不再被迫接入 `Index.tsx`
- lint 清理变成“按模块迁移逐步消化”，而不是一次性手术
- 前端结构更适合继续新增 Cloudflare 相关能力
- `main` 分支仍保持“合并后才发布”的安全节奏
