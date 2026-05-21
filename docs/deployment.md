# Deployment Guide

本文档描述当前仓库推荐的开源自部署方式。

## 1. 创建 D1 数据库

先登录 Cloudflare：

```bash
npx wrangler login
```

创建 D1：

```bash
npx wrangler d1 create cf-panel-db
```

把返回的 `database_id` 填入 `wrangler.toml` 的 `database_id`。

## 2. 初始化数据库

执行仓库内的 schema：

```bash
npx wrangler d1 execute cf-panel-db --file=d1-migration.sql
```

## 3. 配置 Worker

可选配置跨域白名单：

- 本地开发：写入 `.dev.vars`
- 生产环境：在 Cloudflare Dashboard 的 Worker Variables 中设置 `ALLOWED_ORIGINS`

示例：

```env
ALLOWED_ORIGINS=https://your-user.github.io,https://your-project.pages.dev
```

## 4. 部署 Worker

```bash
npm run worker:deploy
```

默认入口文件是：

- `cloudflare-worker-complete.js`

## 5. 配置前端环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

### GitHub Pages

如果前端部署到 GitHub Pages 仓库页，例如：

- `https://your-user.github.io/cf-panel/`

那么建议：

```env
VITE_WORKER_API_URL=https://your-worker.your-subdomain.workers.dev
VITE_BASE_PATH=/cf-panel/
VITE_ADMIN_EMAILS=you@example.com
```

### Cloudflare Pages

如果前端部署到 Cloudflare Pages，例如：

- `https://cf-panel.pages.dev`

通常使用：

```env
VITE_WORKER_API_URL=https://your-worker.your-subdomain.workers.dev
VITE_BASE_PATH=/
VITE_ADMIN_EMAILS=you@example.com
```

## 6. 构建前端

```bash
npm run build
```

构建产物在 `dist/`。

## 7. 发布前端

### 发布到 GitHub Pages

仓库已经自带 GitHub Pages Actions 工作流：

- `.github/workflows/github-pages.yml`

启用前建议在仓库的 `Settings -> Secrets and variables -> Actions -> Variables` 中设置：

- `VITE_WORKER_API_URL`
- `VITE_ADMIN_EMAILS`（可选）

工作流会自动：

- 根据仓库名推导 `VITE_BASE_PATH`
- 执行 `npm ci`
- 执行 `npm run build`
- 发布 `dist/` 到 GitHub Pages

关键点：

- `VITE_BASE_PATH` 必须与仓库子路径一致
- Worker 的 `ALLOWED_ORIGINS` 必须包含 GitHub Pages 域名

### 发布到 Cloudflare Pages

直接把 `dist/` 目录上传或配置 Pages 构建：

- Build command: `npm run build`
- Build output directory: `dist`

如果你把 Worker 绑到同一个自定义域名下，也可以不设置 `VITE_WORKER_API_URL`，让前端走同源地址。

## 8. 验证

建议至少做以下检查：

1. 打开首页，确认静态资源没有 404
2. 输入 Cloudflare 凭据并验证是否能获取 zones
3. 测试 `操作历史`、`Worker 模板库`、`反馈系统`
4. 测试 `D1 SQL 查询` 是否能正常执行只读语句

## 9. 当前已知限制

- 少量 KV / R2 高级操作仍由浏览器直接请求 Cloudflare 官方 API
- 当前没有完整的多用户认证系统，这更像一个“自用/团队内部自部署面板”，不是 SaaS 多租户产品
- `npm run lint` 目前仍有历史代码遗留，需要后续继续收敛
