# 辦公室點餐系統 🍽️ Office Food Ordering System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](./github/workflows/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![D1 Database](https://img.shields.io/badge/D1_SQLite-F38020?style=flat-square&logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](LICENSE)

> **AI 驅動的即時協作點餐系統** — 菜單秒辨、運費自動分攤、Excel 一鍵匯出
> 
> 最新版本 v1.3.0 | Latest version v1.3.0


## 📖 核心概念

這是一個為**團購點餐場景**設計的輕量級系統。主揪上傳菜單照片，AI 即刻解析成線上菜單；參與者實時點餐、選擇規格與配料；

結單時自動計算運費並平分。整個流程從菜單圖片 → AI 辨識 → 線上訂單一氣呵成。

**核心功能：**
- 📸 **菜單 AI 辨識** — Gemini 2.5 Flash 秒懂台灣餐廳菜單 (categories, options, choices)
- ⏱️ **時間限制與延長** — 設定截止時間、剩餘倒數、可一鍵延長 5 分鐘
- 💳 **運費平分機制** — 自動分攤額外費用
- 📊 **Excel 匯出統計** — 一鍵生成訂單明細表 + 收款統計
- 🔐 **身份驗證** — 瀏覽器 UUID token + 用戶名組合，確保付款碼只有點餐者看得到
- 🚀 **邊緣計算部署** — Cloudflare Workers 全球邊緣節點，毫秒級響應

---

## 🏗️ 系統架構

### 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| **前端** | React 18 + Vite + TailwindCSS | 使用者介面與即時更新 |
| **後端** | Hono + Cloudflare Workers | Serverless API 層，自動水平擴展 |
| **資料庫** | Cloudflare D1 (SQLite) | 房間、訂單、參與者 (7日自動清理) |
| **AI 引擎** | Gemini 2.5 Flash | 菜單影像辨識，JSON 結構化輸出 |
| **驗證** | Cloudflare Turnstile | 防止機器人濫用 |

---

## 🛠️ 前置環境準備

確保電腦已安裝：

```bash
# 檢查 Node.js (需 >= 18.x)
node -v

# 檢查 npm (需 >= 9.x)
npm -v

# 檢查 Git
git --version
```

**下載連結：**
- [Node.js LTS](https://nodejs.org/)
- [Git](https://git-scm.com/)

---

## 🚀 快速開始

### 1️⃣ 複製專案

```bash
git clone https://github.com/lianglun0125/food-order-system.git
cd food-order-system
```

### 2️⃣ 安裝依賴

```bash
npm run setup
```

### 3️⃣ 設定環境變數

⚠️ **重要：** 敏感資訊（API 金鑰）不會上傳 GitHub，需要手動取得。

#### 取得 Gemini API Key

1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 點擊「**Get API Key**」
3. 選擇「**Create API key in new project**」
4. 複製產生的 API Key
5. 貼入 `.dev.vars` 中的 `GEMINI_API_KEY`

> 💡 **提示：** Gemini API 有免費額度，每分鐘 ? 次請求，足以測試開發。 (忘記了==)

#### 取得 Cloudflare Turnstile Keys

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左側選單 → **「Security」** → **「Bot Management」** → **「Turnstile」**
3. 點擊「**Create Site**」
4. 填入網站資訊：
   - **Site name** — 例如 `Office Food Ordering`
   - **Domains** — 本地開發填 `localhost`，生產環境填你的網域
5. 選擇 **Managed Challenge** 難度
6. 複製 **Site Key** 和 **Secret Key**

> 💡 **提示：** Turnstile 免費使用，每月 100 萬次查詢免費，超過才計費。

**後端配置** — 在 `backend/` 建立 `.dev.vars`：

```env
GEMINI_API_KEY=your_gemini_api_key_here
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

**前端配置** — 在 `frontend/` 建立 `.env`：

```env
VITE_API_URL=http://localhost:8787
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

### 4️⃣ 啟動開發伺服器

**終端機 1 — 前端 (React)：**

```bash
npm run dev:frontend
```
自動開啟 `http://localhost:5173`

**終端機 2 — 後端 (Workers)：**

```bash
npm run dev:backend
```
API 運行於 `http://localhost:8787`

---

## 📂 專案結構與各模組說明

```
food-order-system/
│
├── backend/                         # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts                # ⭐ 核心 API 路由
│   │   │   ├── POST /api/groups              (建立房間，Gemini 辨識菜單)
│   │   │   ├── GET /api/groups/:code        (查詢房間+菜單，不含收款碼)
│   │   │   ├── POST /api/groups/:code/join  (參與者簽到，心跳追蹤)
│   │   │   ├── GET /api/groups/:id/participants
│   │   │   ├── GET /api/groups/:id/orders   (取訂單)
│   │   │   ├── POST /api/orders             (提交訂單，檢查 deadline)
│   │   │   ├── PATCH /api/orders/:id/pay    (標記付款)
│   │   │   ├── DELETE /api/orders/:id       (刪除訂單)
│   │   │   ├── PATCH /api/groups/:id/status (結單+設定運費)
│   │   │   ├── PATCH /api/groups/:id/menu   (修改菜單)
│   │   │   └── POST /api/groups/:id/payment-qr (驗證後取收款碼圖片)
│   │   │
│   │   └── [Hono + D1 搭配]
│   │
│   ├── wrangler.jsonc              # Cloudflare 配置
│   ├── schema.sql                  # D1 資料庫定義
│   ├── package.json
│   └── .dev.vars                   # 本地密鑰 (勿提交)
│
├── frontend/                        # React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # 首頁：主揪 / 參與者選項
│   │   │   ├── HostOrder.tsx       # 主揪上傳菜單 + 設定時間
│   │   │   ├── JoinOrder.tsx       # 輸入房間碼加入
│   │   │   ├── OrderRoom.tsx       # ⭐ 參與者點餐介面 (核心)
│   │   │   │   ├── 菜單展示 (category tabs)
│   │   │   │   ├── 商品選擇 (options + choices + extras)
│   │   │   │   ├── 手動輸入菜單外品項
│   │   │   │   ├── 購物車 (LocalStorage 本地存儲)
│   │   │   │   ├── 倒數計時顯示
│   │   │   │   └── 付款 QR Code (userToken 驗證)
│   │   │   └── HostDashboard.tsx   # ⭐ 主揪儀表板 (統計+控制)
│   │   │       ├── 即時訂單列表 (5秒更新)
│   │   │       ├── 參與者在線狀態
│   │   │       ├── 運費分攤計算器
│   │   │       ├── 菜單編輯 (修改價格)
│   │   │       ├── 標記付款狀況
│   │   │       ├── 結單 + 設定費用
│   │   │       ├── 延長截止時間
│   │   │       └── Excel 匯出 (明細 + 統計)
│   │   │
│   │   ├── components/
│   │   │   └── [UI Components]
│   │   │
│   │   ├── App.tsx                 # 路由定義
│   │   ├── main.tsx                # 進入點
│   │   └── .env                    # 環境變數 (勿提交)
│   │
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── package.json                    # Monorepo 根配置 (npm run setup)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── LICENSE
└── README.md                       # 本檔案
```

---

## 🔐 安全設計

### userToken 身份驗證流程

```
1. 用戶首次訪問 OrderRoom
   ↓
2. 系統檢查 localStorage 有無 userToken
   ↓
3. 若無 → 生成 crypto.randomUUID() 並存儲
   ↓
4. 提交訂單時，同時傳送 userToken + userName
   ↓
5. 結單後，要看收款碼必須：
   - 用 POST /api/groups/:id/payment-qr
   - 驗證 userToken 與 userName 對應的訂單存在
   - 通過驗證才回傳 payment_qr 圖片
   ↓
6. 防止陌生人冒充點餐者查看收款碼
```

### Turnstile 防機器人
- 建立房間時必須通過 Turnstile 驗證
- 伺服器端驗證 token，確保請求來自真實瀏覽器

### 資料清理
- D1 排程工作每天執行
- 自動刪除 7 天前的房間和訂單
- 防止資料庫無限增長

---

## 📊 運費分攤演算法

```javascript
// 設定額外費用 (運費/折扣/雜費)
extraFeeTotal = 60  // 例：運費 $60

payerCount = 3      // 點餐人數

// 計算每人分攤
rawAvg = 60 / 3 = 20
feePerPerson = Math.ceil(20 / 5) * 5 = 20

// 結果：每人多付 $20，總計 $60
```

特點：**向上取整到 5 元倍數**，避免出現奇怪的 1 元 2 元

---

## 🗄️ 資料庫結構 (Database Schema)

如果你需要手動建立資料表，以下是 SQL 結構：

```sql
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  join_code TEXT,
  menu_json TEXT,
  status TEXT DEFAULT 'OPEN', -- OPEN, LOCKED, DELETED
  created_at INTEGER,
  deadline INTEGER,
  extra_fee INTEGER DEFAULT 0,
  payment_qr TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT,
  user_name TEXT,
  items_json TEXT,
  total_price INTEGER,
  is_paid INTEGER DEFAULT 0,
  created_at INTEGER,
  user_token TEXT -- 用於資安驗證
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT,
  user_name TEXT,
  last_seen INTEGER
);
```

---

## 📈 實時更新機制

### 參與者側 (OrderRoom.tsx)
- 每 **5 秒輪詢** 一次房間狀態
- 檢查是否結單、deadline 變化
- 即時看到倒數計時

### 主揪側 (HostDashboard.tsx)
- 每 **5 秒輪詢** 訂單與參與者
- 實時統計金額、付款狀況
- 心跳追蹤 (last_seen) 判斷在線人數

---

## 🧪 開發指令

### 測試

```bash
# 執行所有測試
npm run test

# 監視模式
npm run test:watch

# 覆蓋率報告
npm run test:coverage
```

### 程式碼品質

```bash
# TypeScript 檢查
npm run type-check

# Linting
npm run lint

# 格式化
npm run format

# 一鍵修復
npm run format:fix
```

### 構建

```bash
# 前端
npm run build:frontend

# 後端
npm run build:backend

# 全部
npm run build
```

---

## 🚢 部署

### Cloudflare 部署

```bash
# 全域安裝 Wrangler
npm install -g wrangler

# 登入帳號
wrangler login

# 部署後端
npm run deploy:backend

# 前端建議用 Cloudflare Pages 或 Vercel 自動化
npm run deploy:frontend
```

### GitHub Actions 自動化

推送到 `main` 分支自動執行：
1. 執行測試
2. TypeScript 檢查
3. 部署 Workers API
4. 發佈前端靜態資源

---

## ❓ 常見問題

**Q: 菜單辨識失敗怎麼辦？**  
A: 確認圖片清晰、文字可讀；嘗試上傳 JPG 而非 PNG；檢查 GEMINI_API_KEY 是否正確配置。

**Q: 運費怎麼設定？**  
A: 主揪結單時輸入「總運費金額」，系統自動平分給所有點餐人。例如 $60 運費 ÷ 3 人 = 每人 $20。

**Q: 收款碼怎麼保護？**  
A: 使用 userToken (瀏覽器 UUID) + userName 驗證，只有點過餐的人才能看到。

**Q: 資料保留多久？**  
A: 系統自動刪除 7 天前的房間和訂單，確保 D1 資料庫乾淨。

**Q: 支援多少人同時點餐？**  
A: Cloudflare Workers 自動水平擴展，理論上無限制。

---

## 🤝 貢獻指南 (Contributing)

歡迎貢獻代碼！請遵循以下步驟：

1. **Fork** 本專案
2. **建立 Feature Branch** — `git checkout -b feature/AmazingFeature`
3. **提交變更** — `git commit -m 'feat: Add some AmazingFeature'`
4. **推送到分支** — `git push origin feature/AmazingFeature`
5. **開啟 Pull Request** — 描述你的改動與測試方式

### Commit 信息規範

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：
- `feat:` — 新功能
- `fix:` — 漏洞修復
- `docs:` — 文檔更新
- `style:` — 代碼風格 (不影響邏輯)
- `refactor:` — 代碼重構
- `perf:` — 性能優化
- `test:` — 測試相關

---

## 📝 License

本項目採用 **MIT License**。詳見 [LICENSE](LICENSE) 檔案。

---

## 🎉 致謝

感謝以下技術與服務：
- [React](https://react.dev) — UI 框架
- [Cloudflare Workers](https://workers.cloudflare.com) — 邊緣計算
- [Google Gemini 2.5 Flash](https://ai.google.dev/) — 菜單辨識
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — SQLite 資料庫
- [Hono](https://hono.dev) — 輕量級 Web 框架
- [Vite](https://vitejs.dev) — 極速前端打包
- [TailwindCSS](https://tailwindcss.com) — 樣式框架
- [XLSX](https://github.com/SheetJS/sheetjs) — Excel 匯出

---

**Enjoy your meal! 🍜**
