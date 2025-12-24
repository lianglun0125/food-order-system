DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS groups;

-- 1. 揪團房間表
CREATE TABLE groups (
    id TEXT PRIMARY KEY, 
    join_code TEXT UNIQUE, 
    menu_json TEXT,
    status TEXT DEFAULT 'OPEN', 
    created_at INTEGER
);

-- 2. 訂單表
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT,      
    user_name TEXT, 
    items_json TEXT,    
    total_price REAL, 
    created_at INTEGER,
    FOREIGN KEY(group_id) REFERENCES groups(id)
);

-- 加個索引讓查詢更快
CREATE INDEX idx_groups_code ON groups(join_code);
CREATE INDEX idx_orders_group ON orders(group_id);