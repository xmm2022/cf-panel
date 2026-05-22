# CF Panel

`CF Panel` 是一个面向自部署场景的 Cloudflare 管理面板。

它的部署模型很简单：

- 前端：`Vite + React`，构建后输出静态文件
- 后端：`Cloudflare Worker`
- 存储：`Cloudflare D1`

这个仓库已经清理掉了原先的私有部署残留，包括：

- 写死的第三方 Worker URL
- Lovable / Supabase 项目绑定
- 仓库内明文 `.env`
- 私有作者联系方式、授权码入口和品牌文案
- 私有默认优选域名和数据库种子数据

## 功能范围

- Zone / DNS / Worker / Route / Tunnel / Pages / D1 / KV / R2 管理
- 操作历史
- Worker 模板库
- 反馈系统
- D1 SQL 查询
- Worker Analytics

## 部署架构

前端大部分功能通过 Worker API 调用 Cloudflare 官方 API；D1 负责存储面板内部数据。

注意：

- 目前有少量高级操作仍然会由浏览器直接请求 `api.cloudflare.com`，使用的是用户自己输入的 Cloudflare 凭据。
- 这不会把请求转发到原作者服务器，但意味着浏览器端仍然会直接持有并使用这些凭据。

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 准备前端环境变量

```bash
cp .env.example .env.local
```

`.env.local` 常用项：

```env
VITE_WORKER_API_URL=http://127.0.0.1:8787
VITE_BASE_PATH=/
VITE_ADMIN_EMAILS=
```

3. 准备 Worker 本地变量

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` 目前只需要可选的跨域白名单：

```env
ALLOWED_ORIGINS=http://localhost:8080
```

4. 启动前端

```bash
npm run dev
```

5. 另开一个终端启动 Worker

```bash
npm run worker:dev
```

## 生产部署

完整步骤见 [docs/deployment.md](docs/deployment.md)。

发布辅助文档：

- [RELEASE_NOTES.md](RELEASE_NOTES.md)
- [docs/public-release-checklist.md](docs/public-release-checklist.md)

常见组合：

- `GitHub Pages + Cloudflare Worker + D1`
- `Cloudflare Pages + Cloudflare Worker + D1`
- `任意静态托管 + Cloudflare Worker + D1`

仓库内已经附带 GitHub Pages 工作流：

- [.github/workflows/github-pages.yml](./.github/workflows/github-pages.yml)

## 环境变量

前端：

- `VITE_WORKER_API_URL`
  前端调用的 Worker 根地址，例如 `https://your-worker.your-subdomain.workers.dev`
- `VITE_BASE_PATH`
  静态站点部署子路径。GitHub Pages 仓库页通常设置为 `/<repo-name>/`
- `VITE_ADMIN_EMAILS`
  可选，逗号分隔。用于开启反馈管理和 Workers 隐藏开关等管理员 UI

Worker：

- `ALLOWED_ORIGINS`
  可选，逗号分隔。为空时允许任意来源；设置后仅允许指定来源访问 Worker API

## 仓库清理说明

为了让这个仓库适合公开发布，建议不要提交以下文件：

- `.env.local`
- `.dev.vars`
- `.wrangler/`
- 任何包含真实 Cloudflare / Supabase / GitHub Pages 资源 ID 的配置

## 项目结构与扩展开发

```
src/
  pages/
    Index.tsx                    顶层协调器：导航 / 共享状态 / 跨模块回调
  components/
    index-page/                  Index 各视图按功能拆出的子模块
      shared/
        index-page-types.ts      多视图共享类型（如 KVNamespaceSummary）
        formatters.ts            通用格式化纯函数（数值、字节、百分比）
      analytics/                 已抽出：分析统计视图
      pages/                     已抽出：Cloudflare Pages 管理 + 创建对话框
      kv-storage/                已抽出：Workers KV 命名空间 / 键值对管理
      <view-name>/               其他视图按相同模式逐步抽出
    <Domain>Form.tsx             历史遗留的独立组件，按需迁移到 index-page/
  lib/
    supabase-adapter.ts          Worker API 客户端薄封装
docs/
  deployment.md                  生产部署步骤
  superpowers/
    plans/                       重构计划（可继续推进 Task 5-8）
    specs/                       重构设计文档
```

### 添加新视图的推荐做法

不要继续往 `Index.tsx` 堆 JSX。任何新增功能优先在 `src/components/index-page/<view>/` 下建模块：

1. 用 TDD 流程，先写 `<View>.test.tsx`（覆盖空态、加载、关键回调 dispatch）
2. 视图组件 props-driven，无 `any`；复杂类型放 `<view>-types.ts`
3. 纯函数 helpers（解析、格式化、构建文件名等）放 `<view>-actions.ts` 并独立测试
4. `Index.tsx` 只接组件、命名 async handler（`handle<View><Action>`）、通过 props 传给视图；toast / confirm 文字留在 Index 业务回调里
5. 抽完用中文 UI 字符串集合 diff 验证行为等价（参考 analytics/pages/kv 三个模块的 commit message 验证清单）

### 测试与质量门槛

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest run
npm run build       # vite build
```

新模块应保持 lint 零 `any`、tsc 干净、build 通过。`Index.tsx` 仍残留若干历史 `any`，会随各视图陆续抽出而下降。

### 重构进度

`Index.tsx` 已从最初的 10527 行精简到约 8400 行，主要靠抽出 `analytics` / `pages` / `kv-storage` 三个模块。`docs/superpowers/plans/2026-05-22-index-page-modularization.md` 还列了 Page Rules / Certificates / Tunnels / D1 / R2 等剩余视图的抽取步骤，每个视图都可以独立完成、不影响已稳定的模块。

## License

本仓库当前使用 `MIT` 许可证，见 [LICENSE](./LICENSE)。
