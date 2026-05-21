-- CF Panel D1 schema
-- Run with:
--   wrangler d1 execute cf-panel-db --file=d1-migration.sql

CREATE TABLE IF NOT EXISTS cloudflare_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  domain TEXT,
  worker_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cloudflare_usage_user_id ON cloudflare_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_user_id ON operation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_created_at ON operation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_worker_templates_user_id ON worker_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_templates_category ON worker_templates(category);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_votes ON feedbacks(votes);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

INSERT OR IGNORE INTO app_settings (id, key, value, description)
VALUES (
  'settings-workers-hidden',
  'workers_hidden',
  'false',
  'Controls whether the Workers section is hidden by default'
);
