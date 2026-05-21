# Lovable Cloud 到 Cloudflare D1 + Workers 迁移指南

## 📋 迁移前准备

### 1. 导出现有数据
在 Lovable 后端导出以下数据：
- `profiles` 表
- `access_codes` 表  
- `cloudflare_usage` 表

## 🚀 迁移步骤

### 步骤 1：创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **D1 SQL Database**
3. 点击 **Create database**
4. 命名为 `spider-backend`
5. 创建成功后，记录 **Database ID**

### 步骤 2：执行数据库迁移

1. 在 D1 数据库页面，点击 **Console** 标签
2. 打开 `d1-migration.sql` 文件
3. **逐段复制执行**以下部分：

#### 第一段：创建表结构
```sql
-- 复制并执行 lines 9-45（表结构和索引）
```

#### 第二段：插入示例数据
```sql
-- 复制并执行 lines 52-57（现有用户数据）
```

#### 第三段：导入导出的数据
将从 Lovable Cloud 导出的数据转换为 INSERT 语句后执行

### 步骤 3：配置 Worker

1. 修改 `wrangler.toml` 文件：
```toml
[[d1_databases]]
binding = "DB"
database_name = "spider-backend"
database_id = "YOUR_DATABASE_ID_HERE" # 替换为实际 Database ID
```

2. 在 Cloudflare Dashboard 设置环境变量：
   - 进入 **Workers & Pages** → 你的 Worker → **Settings** → **Variables**
   - 添加 `ACCESS_PASSWORD`（从 Lovable Cloud secrets 复制）

### 步骤 4：部署 Worker

使用以下命令之一部署：

#### 方法 A：使用 Wrangler CLI（推荐）
```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 部署
wrangler deploy
```

#### 方法 B：使用 Dashboard 手动部署
1. 进入 **Workers & Pages** → **Create Application** → **Create Worker**
2. 将 `cloudflare-worker-complete.js` 内容复制粘贴到编辑器
3. 点击 **Save and Deploy**
4. 在 **Settings** → **Variables** 中绑定 D1 数据库

### 步骤 5：配置路由

1. 在 Worker 设置中添加自定义域名（可选）
2. 或使用默认的 `*.workers.dev` 域名

### 步骤 6：更新前端配置

修改前端代码中的 API 调用地址：

```typescript
// 旧方式（Lovable Cloud）
const { data, error } = await supabase.functions.invoke('cloudflare-api', {...})

// 新方式（Cloudflare Worker）
const response = await fetch('https://YOUR-WORKER.workers.dev/api/cloudflare-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'list_zones',
    email: 'your@email.com',
    apiKey: 'your-api-key'
  })
})
```

## 🔄 API 端点映射

| Lovable Cloud Edge Function | Cloudflare Worker 路径 |
|------------------------------|------------------------|
| `cloudflare-api` | `/api/cloudflare-api` |
| `verify-cloudflare` | `/api/verify-cloudflare` |
| `verify-access-code` | `/api/verify-access-code` |
| `verify-admin-password` | `/api/verify-admin-password` |
| `deploy-worker` | `/api/deploy-worker` |

## 📊 数据库查询对比

### Lovable Cloud (Supabase)
```typescript
const { data } = await supabase.from('profiles').select('*').eq('id', userId)
```

### Cloudflare D1
```javascript
const result = await env.DB.prepare(
  'SELECT * FROM profiles WHERE id = ?'
).bind(userId).first()
```

## ✅ 验证迁移

### 1. 测试数据库连接
```bash
# 使用 Wrangler 查询
wrangler d1 execute spider-backend --command "SELECT COUNT(*) FROM profiles"
```

### 2. 测试 API 端点
```bash
# 测试验证 Cloudflare 凭证
curl -X POST https://YOUR-WORKER.workers.dev/api/verify-cloudflare \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","apiKey":"test-key"}'
```

### 3. 检查日志
在 Cloudflare Dashboard 中查看 Worker 日志：
**Workers & Pages** → 你的 Worker → **Logs** → **Real-time Logs**

## 🔧 常见问题

### Q: Database ID 在哪里找？
A: D1 数据库页面 → **Settings** → **Database ID**

### Q: 如何回滚？
A: 保留 Lovable Cloud 的代码和数据，随时可以切换回去

### Q: Worker 支持多少请求？
A: 免费版每天 100,000 次请求，付费版无限制

### Q: D1 数据库有多大？
A: 免费版 5GB 存储，100,000 次读取/天，50,000 次写入/天

## 💰 成本对比

| 项目 | Lovable Cloud | Cloudflare Workers |
|------|---------------|-------------------|
| 数据库 | 基于使用量 | 免费 5GB |
| API 调用 | 基于使用量 | 免费 10万/天 |
| 全球部署 | ✅ | ✅ |
| 冷启动 | 有 | 极少 |

## 📚 参考文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 🎯 下一步

1. ✅ 创建 D1 数据库
2. ✅ 执行数据迁移
3. ✅ 部署 Worker
4. ⏳ 更新前端代码
5. ⏳ 测试所有功能
6. ⏳ 切换生产环境

---

**需要帮助？** 查看 Cloudflare 社区论坛或联系技术支持。
