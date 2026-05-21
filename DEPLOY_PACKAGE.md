# 部署包 - SQL + Worker 完整代码

## 1️⃣ 在 Cloudflare D1 控制台执行以下 SQL

```sql
-- 创建 operation_history 表
CREATE TABLE IF NOT EXISTS operation_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT,
  zone_id TEXT,
  action_details TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建 worker_templates 表
CREATE TABLE IF NOT EXISTS worker_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  script_content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_public INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_operation_history_user_id ON operation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_created_at ON operation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_worker_templates_user_id ON worker_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_templates_category ON worker_templates(category);
```

## 2️⃣ Worker 完整代码

**Worker 代码在 `cloudflare-worker-complete.js` 文件中，完整复制该文件内容到 Cloudflare Workers 编辑器。**

关键修改点：
- ✅ 支持 `lovable.app` 和 `lovableproject.com` 两种域名格式
- ✅ 添加了两个新 API 端点：
  - `/api/operation-history` - 操作历史记录（自动清理 15 天前数据）
  - `/api/worker-templates` - Worker 模板库

## 3️⃣ 部署步骤

### Cloudflare Dashboard 部署方式：

1. **创建 D1 数据库**
   - 进入 Cloudflare Dashboard → Workers & Pages → D1
   - 创建名为 `spider-backend` 的数据库
   - 在数据库的 SQL 控制台中粘贴执行上面的 SQL

2. **更新 Worker 代码**
   - 进入你的 Worker（`spider-backend`）
   - 点击 Quick Edit
   - 完整替换为 `cloudflare-worker-complete.js` 的内容
   - Save and Deploy

3. **绑定 D1 数据库**
   - 在 Worker Settings → Variables → D1 Database Bindings
   - Variable name: `DB`
   - D1 database: 选择刚创建的 `spider-backend`

### Wrangler CLI 部署方式：

```bash
# 1. 创建 D1 数据库
wrangler d1 create spider-backend

# 2. 更新 wrangler.toml 中的 database_id（使用上一步返回的 ID）

# 3. 执行 SQL 迁移
wrangler d1 execute spider-backend --file=d1-migration.sql

# 4. 部署 Worker
wrangler deploy
```

完成后刷新页面，新功能即可正常使用！

## 🔍 功能说明

### 操作历史
- 自动记录所有 DNS、Worker 等资源的操作
- 自动清理 15 天前的记录，保持数据库轻量
- 包含操作类型、资源名称、时间戳等详细信息

### Worker 模板库
- 保存常用的 Worker 脚本作为模板
- 支持公开/私有模板
- 快速复用代码，提高开发效率
