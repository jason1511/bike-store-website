CREATE TABLE IF NOT EXISTS admin_presence (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  current_view TEXT NOT NULL DEFAULT '',
  editing_target TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'online',
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_presence_last_seen
ON admin_presence(last_seen);

CREATE INDEX IF NOT EXISTS idx_admin_presence_user
ON admin_presence(user_id, last_seen);
