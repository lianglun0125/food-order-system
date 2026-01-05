-- --------------------------------------------------------
-- Food Ordering System - Database Schema
-- 🚀 Cloudflare D1 (SQLite)
-- --------------------------------------------------------

-- 1. 房間資訊表：儲存揪團房間的核心設定
CREATE TABLE IF NOT EXISTS "groups" (
  id TEXT PRIMARY KEY,                                -- 房間 ID（UUID），各表關聯用主鍵
  join_code TEXT NOT NULL,                             -- 加入碼（4 位數等），使用者用它進房
  menu_json TEXT NOT NULL,                             -- 菜單 JSON（Gemini 解析後的完整菜單）
  status TEXT NOT NULL DEFAULT 'OPEN'                  -- 房間狀態：OPEN/LOCKED/DELETED
    CHECK (status IN ('OPEN','LOCKED','DELETED')),     -- 限制狀態值，避免寫入未知狀態
  created_at INTEGER NOT NULL,                         -- 建立時間（Unix ms，例如 Date.now()）
  deadline INTEGER,                                    -- 截止時間（Unix ms；NULL 代表不限時）
  extra_fee INTEGER NOT NULL DEFAULT 0,                -- 額外費用（運費/雜費/折扣等；整數）
  payment_qr TEXT,                                     -- 收款 QR（通常是 base64 data URL；可為 NULL）
  host_token TEXT NOT NULL                             -- 主揪 token（存在 localStorage，呼叫管理 API 用）
);

-- =========================================================
-- Table: orders（訂單）
-- =========================================================
CREATE TABLE IF NOT EXISTS "orders" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,                -- 訂單流水號
  group_id TEXT NOT NULL,                              -- 所屬房間 ID（對應 groups.id）
  user_name TEXT NOT NULL,                             -- 下單者暱稱（你 UI/統計用的顯示名）
  items_json TEXT NOT NULL,                            -- 訂單品項 JSON（[{n,p}, ...]）
  total_price INTEGER NOT NULL,                        -- 訂單總額（整數；避免浮點誤差）
  created_at INTEGER NOT NULL,                         -- 下單時間（Unix ms）
  is_paid INTEGER NOT NULL DEFAULT 0                   -- 是否已付款：0 未付、1 已付
    CHECK (is_paid IN (0,1)),                          -- 限制布林值只能是 0/1
  user_token TEXT NOT NULL,                            -- 使用者 token（用於驗證本人/取得付款碼等）
  FOREIGN KEY (group_id) REFERENCES "groups"(id)        -- 外鍵：訂單一定屬於某房間
    ON DELETE CASCADE                                  -- 刪除房間時連帶刪除訂單（避免孤兒資料）
);

-- =========================================================
-- Table: participants（參與者/在線狀態）
-- =========================================================
CREATE TABLE IF NOT EXISTS "participants" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,                -- 參與者流水號
  group_id TEXT NOT NULL,                              -- 所屬房間 ID（對應 groups.id）
  user_name TEXT NOT NULL COLLATE NOCASE,              -- 暱稱（不分大小寫，用於同房間唯一性）
  user_token TEXT NOT NULL,                            -- 使用者 token（用於重登/防冒名）
  last_seen INTEGER NOT NULL,                          -- 最後心跳時間（Unix ms，用於判斷在線）
  UNIQUE (group_id, user_name),                        -- 同一房間暱稱唯一（NOCASE：大小寫視為同名）
  FOREIGN KEY (group_id) REFERENCES "groups"(id)        -- 外鍵：參與者一定屬於某房間
    ON DELETE CASCADE                                  -- 刪除房間時連帶刪除參與者
);

-- =========================================================
-- Indexes（加速查詢）
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_join_code
  ON groups(join_code);                                -- 依 join_code 找房間 + 保證加入碼唯一

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_host_token
  ON groups(host_token);                               -- 主揪 token 唯一（方便驗證/避免重複）

CREATE INDEX IF NOT EXISTS idx_orders_group_created_at
  ON orders(group_id, created_at DESC);                -- 抓某房間訂單並依時間排序（後台/房間頁）

CREATE INDEX IF NOT EXISTS idx_participants_group_last_seen
  ON participants(group_id, last_seen DESC);            -- 抓某房間參與者並依 last_seen 排序（在線清單）

-- 結束 defer（若此檔案在 transaction 中執行，最終仍會檢查外鍵一致性）。
PRAGMA defer_foreign_keys = off;