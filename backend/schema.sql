PRAGMA foreign_keys = ON;

-- ----------------------------

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  join_code TEXT,
  menu_json TEXT,
  status TEXT DEFAULT 'OPEN',
  created_at INTEGER,
  deadline INTEGER,
  extra_fee INTEGER DEFAULT 0,
  payment_qr TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_join_code
ON groups(join_code);

CREATE INDEX IF NOT EXISTS idx_groups_created_at
ON groups(created_at);

-- ----------------------------

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT,
  user_name TEXT,
  items_json TEXT,
  total_price INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER,
  is_paid INTEGER DEFAULT 0,
  user_token TEXT,
  FOREIGN KEY(group_id) REFERENCES groups(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_group_created_at
ON orders(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_group_user_token
ON orders(group_id, lower(user_name), user_token);

-- ----------------------------

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_token TEXT NOT NULL,
  last_seen INTEGER,
  UNIQUE(group_id, user_name),
  FOREIGN KEY(group_id) REFERENCES groups(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_group_name_nocase
ON participants(group_id, lower(user_name));

CREATE INDEX IF NOT EXISTS idx_participants_group_last_seen
ON participants(group_id, last_seen DESC);
