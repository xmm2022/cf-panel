-- Cloudflare D1 数据库迁移脚本
-- 在 Cloudflare Dashboard 的 D1 SQL 控制台中按顺序执行以下命令

-- =====================================================
-- 1. 创建表结构
-- =====================================================

-- 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建 access_codes 表
CREATE TABLE IF NOT EXISTS access_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建 cloudflare_usage 表
CREATE TABLE IF NOT EXISTS cloudflare_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  domain TEXT,
  worker_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

-- 创建 monitor_servers 表（服务器监测）
CREATE TABLE IF NOT EXISTS monitor_servers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  check_interval INTEGER NOT NULL DEFAULT 5,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_check_time TEXT,
  last_status TEXT,
  last_response_time INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建 auto_shield_rules 表（自动开盾规则）
CREATE TABLE IF NOT EXISTS auto_shield_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  trigger_type TEXT NOT NULL,
  threshold REAL NOT NULL,
  action TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  last_triggered TEXT,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建 server_status_logs 表（服务器状态日志 - 扩展版本）
CREATE TABLE IF NOT EXISTS server_status_logs (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  -- CPU 指标
  cpu_usage REAL,
  cpu_load_1 REAL,
  cpu_load_5 REAL,
  cpu_load_15 REAL,
  -- 内存指标
  memory_total INTEGER,
  memory_used INTEGER,
  memory_free INTEGER,
  memory_percent REAL,
  -- 磁盘指标
  disk_total TEXT,
  disk_used TEXT,
  disk_free TEXT,
  disk_percent REAL,
  -- 网络指标
  tcp_connections INTEGER,
  total_connections INTEGER,
  network_rx TEXT,
  network_tx TEXT,
  -- 其他指标
  process_count INTEGER,
  uptime TEXT,
  hostname TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建 feedbacks 表（需求反馈）
CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('feature', 'bug', 'suggestion')),
  title TEXT NOT NULL,
  description TEXT,
  contact_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'rejected')),
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建 shield_operation_logs 表（开盾操作日志）
CREATE TABLE IF NOT EXISTS shield_operation_logs (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  action TEXT NOT NULL,
  trigger_reason TEXT NOT NULL,
  trigger_value REAL,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_user_id ON access_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);
CREATE INDEX IF NOT EXISTS idx_cloudflare_usage_user_id ON cloudflare_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_operation_history_user_id ON operation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_created_at ON operation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_worker_templates_user_id ON worker_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_templates_category ON worker_templates(category);
CREATE INDEX IF NOT EXISTS idx_monitor_servers_user_id ON monitor_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_monitor_servers_enabled ON monitor_servers(enabled);
CREATE INDEX IF NOT EXISTS idx_auto_shield_rules_user_id ON auto_shield_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_shield_rules_server_id ON auto_shield_rules(server_id);
CREATE INDEX IF NOT EXISTS idx_auto_shield_rules_enabled ON auto_shield_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_server_status_logs_server_id ON server_status_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_server_status_logs_created_at ON server_status_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_shield_operation_logs_rule_id ON shield_operation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_shield_operation_logs_server_id ON shield_operation_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_shield_operation_logs_created_at ON shield_operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_votes ON feedbacks(votes);

-- =====================================================
-- 2. 插入现有数据
-- =====================================================

-- 插入 profiles 数据
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES ('f22f8a4b-1fbe-4fa6-bcd9-a814b1159ce0', 'ceocok@gmail.com', 'max', 'user', '2025-10-30 15:42:49', '2025-10-30 15:42:49');

-- 插入 access_codes 数据
INSERT INTO access_codes (id, user_id, code, status, expires_at, created_at, updated_at)
VALUES ('9a8a0302-01f6-4eaf-9dd9-adfac79ea436', 'f22f8a4b-1fbe-4fa6-bcd9-a814b1159ce0', 'AC-93SJ86PFK', 'pending', NULL, '2025-10-30 15:42:57', '2025-10-30 15:42:57');

-- =====================================================
-- 3. 验证数据
-- =====================================================

-- 创建全局配置表
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- 插入默认配置 - Workers 默认隐藏
INSERT INTO app_settings (id, key, value, description)
VALUES ('settings-workers-hidden', 'workers_hidden', 'true', 'Control Workers section visibility for all users');

-- =====================================================
-- 3. 验证数据
-- =====================================================

-- 验证表已创建
SELECT name FROM sqlite_master WHERE type='table';

-- 验证数据已插入
SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as access_code_count FROM access_codes;
SELECT COUNT(*) as usage_count FROM cloudflare_usage;
SELECT COUNT(*) as settings_count FROM app_settings;
