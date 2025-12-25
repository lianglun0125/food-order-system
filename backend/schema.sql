-- --------------------------------------------------------
-- Food Ordering System - Database Schema
-- 🚀 Cloudflare D1 (SQLite)
-- --------------------------------------------------------

-- 1. 房間資訊表：儲存揪團房間的核心設定
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,               -- 房間 UUID
  join_code TEXT,                    -- 4 位數房間代碼
  menu_json TEXT,                    -- AI 辨識出的菜單 JSON 結構
  status TEXT DEFAULT 'OPEN',        -- 狀態: OPEN (點餐中), LOCKED (已結單), DELETED (已刪除)
  created_at INTEGER,                -- 建立時間戳記
  deadline INTEGER,                  -- 截止時間戳記 (選填)
  extra_fee INTEGER DEFAULT 0,       -- 總額外費用 (如運費)
  payment_qr TEXT                    -- 收款碼圖片的 Base64 字串 (選填)
);

-- 2. 訂單明細表：儲存使用者的點餐內容
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT,                     -- 關聯的房間 ID
  user_name TEXT,                    -- 使用者暱稱
  items_json TEXT,                   -- 點餐品項與細節 JSON
  total_price REAL,                  -- 該筆訂單總額
  created_at INTEGER,                -- 下單時間
  is_paid INTEGER DEFAULT 0,         -- 是否已付款 (0:未付, 1:已付)
  user_token TEXT,                   -- 瀏覽器 UUID，用於身份驗證與收款碼保護
  FOREIGN KEY(group_id) REFERENCES groups(id) -- 外鍵約束，確保訂單屬於有效房間
);

-- 3. 參與者追蹤表：用於即時顯示線上人數與暱稱檢查
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,            -- 房間 ID
  user_name TEXT NOT NULL,           -- 使用者暱稱
  last_seen INTEGER,                 -- 最後活躍時間 (心跳機制用)
  -- 確保同一個房間內暱稱不重複，且支援 ON CONFLICT 更新
  UNIQUE(group_id, user_name)
);