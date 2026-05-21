# Release Notes

## v0.1.0

首个公开可自部署版本。

### 主要变化

- 收敛部署模型为 `Vite frontend + Cloudflare Worker + D1`
- 移除原先的私有部署残留、外部验证入口和硬编码第三方后端地址
- 新增开源化文档、示例环境变量和 GitHub Pages 工作流
- 将前端 Worker API 地址改为通过 `VITE_WORKER_API_URL` 注入
- 清理 D1 初始化脚本，只保留当前实际用到的面板表结构

### 已验证

- GitHub Pages 前端可正常发布
- Cloudflare Worker 可正常部署
- D1 schema 可正常初始化
- 前端可正确调用线上 Worker API

### 当前限制

- 少量 KV 高级操作仍由浏览器直接请求 Cloudflare 官方 API
- 当前项目更偏向自部署/自用，不是完整多租户 SaaS
- `npm run lint` 仍有历史代码债，后续需要逐步清理
