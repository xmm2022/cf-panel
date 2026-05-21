# Worker 重新部署指南

## 🔄 快速重新部署

由于修复了验证 API 端点的问题，你需要重新部署 Worker。

### 方法 1：使用 Wrangler CLI（推荐）

```bash
# 确保在项目根目录
wrangler deploy
```

### 方法 2：使用 Cloudflare Dashboard

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages**
3. 找到你的 Worker（`spider-backend`）
4. 点击 **Quick Edit**
5. 删除旧代码，复制粘贴 `cloudflare-worker-complete.js` 的完整内容
6. 点击 **Save and Deploy**

### 方法 3：使用 Wrangler CLI 上传单个文件

```bash
# 上传脚本
wrangler deploy cloudflare-worker-complete.js --name spider-backend
```

## ✅ 验证部署成功

部署完成后，重新在前端输入 Cloudflare 凭证进行验证。

## 🔍 更改详情

### 修复的问题
- **旧代码**：使用 `/user/tokens/verify` 端点（仅适用于 API Token）
- **新代码**：使用 `/user` 端点（适用于 Global API Key）

### 验证逻辑变化
```javascript
// 旧代码（错误）
fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', ...)

// 新代码（正确）
fetch('https://api.cloudflare.com/client/v4/user', ...)
```

## 📝 注意事项

- 重新部署不会影响现有的 Worker 路由配置
- D1 数据库绑定保持不变
- 环境变量无需重新设置
