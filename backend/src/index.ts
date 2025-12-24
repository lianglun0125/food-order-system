import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fromByteArray } from 'base64-js'

type Bindings = {
  DB: D1Database
  GEMINI_API_KEY: string
  RATE_LIMITER: any 
  TURNSTILE_SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

const ALLOWED_ORIGINS = [
  'https://food-order.chelunliang.com', 
  'http://localhost:5173',              
  'http://localhost:8787'               
];

app.use('/*', cors({
  origin: (origin) => {
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

app.use('/api/*', async (c, next) => {
  return await next();
});

// --- API 邏輯 ---

app.patch('/api/orders/:id/pay', async (c) => {
  const orderId = c.req.param('id')
  const { isPaid } = await c.req.json()
  await c.env.DB.prepare('UPDATE orders SET is_paid = ? WHERE id = ?')
    .bind(isPaid ? 1 : 0, orderId).run()
  return c.json({ success: true })
})

app.post('/api/groups/:code/join', async (c) => {
  const code = c.req.param('code')
  const { userName } = await c.req.json()
  const group = await c.env.DB.prepare('SELECT id FROM groups WHERE join_code = ?').bind(code).first()
  if (!group) return c.json({ error: '房間不存在' }, 404)
  await c.env.DB.prepare(`
    INSERT INTO participants (group_id, user_name, last_seen) 
    VALUES (?, ?, ?)
    ON CONFLICT(group_id, user_name) DO UPDATE SET last_seen = ?
  `).bind(group.id, userName, Date.now(), Date.now()).run()
  return c.json({ success: true })
})

app.get('/api/groups/:id/participants', async (c) => {
  const groupId = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT user_name, last_seen FROM participants WHERE group_id = ? ORDER BY last_seen DESC'
  ).bind(groupId).all()
  return c.json({ participants: results })
})

app.patch('/api/groups/:id/menu', async (c) => {
  const groupId = c.req.param('id')
  const { menu } = await c.req.json()
  if (!menu || !menu.categories) return c.json({ error: '菜單格式錯誤' }, 400)
  await c.env.DB.prepare('UPDATE groups SET menu_json = ? WHERE id = ?')
    .bind(JSON.stringify(menu), groupId).run()
  return c.json({ success: true })
})

// ★★★ 修正 1: POST 建立房間時接收 deadline ★★★
app.post('/api/groups', async (c) => {
  try {
    const formData = await c.req.parseBody()
    const imageFile = formData['image']
    const paymentQrFile = formData['paymentQr'] // ★ 新增：收款碼圖片
    const turnstileToken = formData['cf-turnstile-response']
    const deadlineStr = formData['deadline'] as string // 接收 deadline

    if (!imageFile || !(imageFile instanceof File)) return c.json({ error: '請上傳圖片' }, 400)
    if (imageFile.size > 5 * 1024 * 1024) return c.json({ error: '圖片太大囉！請小於 5MB' }, 400)
    if (!turnstileToken || typeof turnstileToken !== 'string') return c.json({ error: '請完成人機驗證' }, 400)

    // Turnstile 驗證省略... (與原程式碼相同，為節省篇幅這裡略過，請保留你原本的驗證邏輯)
    // ...

    const arrayBuffer = await imageFile.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const base64Image = fromByteArray(uint8Array)
    const apiKey = c.env.GEMINI_API_KEY
    if (!apiKey) return c.json({ error: 'Server Error: GEMINI_API_KEY not configured' }, 500)

    let paymentQrBase64 = null;
    if (paymentQrFile && paymentQrFile instanceof File) {
        if (paymentQrFile.size > 2 * 1024 * 1024) return c.json({ error: '收款碼圖片太大了，請小於 2MB' }, 400); // 限制收款碼大小
        const qrBuffer = await paymentQrFile.arrayBuffer();
        const qrUint8 = new Uint8Array(qrBuffer);
        // 加上前綴，方便前端直接 <img src="...">
        paymentQrBase64 = `data:${paymentQrFile.type};base64,${fromByteArray(qrUint8)}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const prompt = `
    Role: Expert Menu Digitizer for Taiwanese Restaurants.
    Task: Extract menu data from the image into strict JSON.
    Language: Traditional Chinese (繁體中文).

    *** ANALYSIS STRATEGY (HOW TO READ) ***
    1. **Scan for Layout Type:**
       - **Matrix/Grid Layout (Common in Snack Shops):** If you see a row/column of Main Items (e.g., "魷魚羹", "羊肉羹") and a set of Carb/Style choices (e.g., "油麵", "米粉", "飯", "湯") that apply to them, **DO NOT** list them as separate items (e.g., do NOT list "魷魚羹麵", "魷魚羹飯" separately).
         - Action: Create ONE item (e.g., "魷魚羹").
         - Action: Put the styles ("油麵", "米粉", "飯") into the "choices" array.
       
       - **Drink Menu Layout:**
         If you see items with sizes (M/L) and prices, usually aligned in columns.
         - Action: Put sizes into the "options" array (e.g., [{"name": "M", "price": 50}, {"name": "L", "price": 60}]).
    
    2. **Scan for Footers/Sidebars (Global Info):**
       - **Toppings/Add-ons:** Look for keywords like "加料區", "配料", "PLUS+", "加購". Extract these into "global_extras".
       - **Adjustments:** Look for Sugar/Ice tables (e.g., "甜度", "冰塊"). You don't need to output these, but be aware they are not menu items.

    *** JSON OUTPUT RULES ***
    Return ONLY a JSON object with this structure:
    {
      "global_extras": [ {"n": "Name (e.g. 珍珠)", "p": Price (number)} ],
      "categories": [
        {
          "name": "Category Name (e.g. 羹類, 鮮奶茶)",
          "items": [
            {
              "n": "Item Name (e.g. 魷魚羹)",
              "p": BasePrice (number, use lowest price if multiple),
              "options": [
                 {"name": "Size/Spec (e.g. 小, M)", "price": 50},
                 {"name": "Size/Spec (e.g. 大, L)", "price": 60}
              ],
              "choices": ["String Array of variants (e.g. 油麵, 米粉, 飯, 粄條) - Only if applicable"]
            }
          ]
        }
      ]
    }

    *** IMPORTANT CONSTRAINTS ***
    - If an item has only one price, "options" should be: [{"name": "單一規格", "price": 50}].
    - "p" (price) in the root item is required for sorting, use the lowest option price.
    - Do not output markdown code blocks (like \`\`\`json). Just the raw JSON string.
    `
    const payload = {
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: imageFile.type || "image/jpeg", data: base64Image } }] }],
      generationConfig: { response_mime_type: "application/json" }
    }

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json() as any
    const jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!jsonString) return c.json({ error: 'Gemini 解析失敗', details: data }, 500)

    let menuJson = {}
    try { menuJson = JSON.parse(jsonString.replace(/```json/g, '').replace(/```/g, '').trim()) } 
    catch (e) { return c.json({ error: '菜單格式解析失敗' }, 500) }

    const groupId = crypto.randomUUID()
    const joinCode = Math.floor(1000 + Math.random() * 9000).toString() 
    
    // 處理 deadline (如果是 'null' 字串或空值則存 NULL)
    const deadline = deadlineStr && deadlineStr !== 'null' ? Number(deadlineStr) : null;

    // 寫入資料庫
    await c.env.DB.prepare(`INSERT INTO groups (id, join_code, menu_json, created_at, deadline, payment_qr) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(groupId, joinCode, JSON.stringify(menuJson), Date.now(), deadline, paymentQrBase64).run()

    return c.json({ success: true, joinCode, groupId, menu: menuJson })
  } catch (e) {
    return c.json({ error: '系統錯誤', details: String(e) }, 500)
  }
})

app.delete('/api/orders/:id', async (c) => {
  const orderId = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run()
  return c.json({ success: true })
})

// ★★★ 修正 2: PATCH 更新狀態時，也要能更新 deadline (延長功能) ★★★
app.patch('/api/groups/:id/status', async (c) => {
  const groupId = c.req.param('id')
  const { status, extraFee, deadline } = await c.req.json() 
  
  // 動態組裝 SQL (比較靈活)
  let query = 'UPDATE groups SET status = status';
  const params: any[] = [];

  if (status !== undefined) {
    query += ', status = ?';
    params.push(status);
  }
  if (extraFee !== undefined) {
    query += ', extra_fee = ?';
    params.push(extraFee);
  }
  if (deadline !== undefined) {
    query += ', deadline = ?';
    params.push(deadline);
  }

  query += ' WHERE id = ?';
  params.push(groupId);

  await c.env.DB.prepare(query).bind(...params).run();
  
  return c.json({ success: true })
})

// ★★★ 修正 3: GET 回傳 deadline ★★★
app.get('/api/groups/:code', async (c) => {
  const code = c.req.param('code')
  const group = await c.env.DB.prepare(`SELECT * FROM groups WHERE join_code = ?`).bind(code).first()
  if (!group) return c.json({ error: '無效的代碼' }, 404)
  if (group.status === 'DELETED') return c.json({ error: '房間已刪除' }, 404)
  
  return c.json({ 
    id: group.id, 
    joinCode: group.join_code, 
    menu: JSON.parse(group.menu_json as string), 
    status: group.status,
    extra_fee: group.extra_fee,
    deadline: group.deadline,
    // payment_qr: group.payment_qr  <-- 這一行刪掉或註解掉，不讓路人看到！
    has_payment_qr: !!group.payment_qr // 改回傳 boolean，告訴前端「有圖片喔」，但不給內容
  })
})

// ★★★ 新增：專用取圖 API (有下單才能看) ★★★
app.post('/api/groups/:id/payment-qr', async (c) => {
  const groupId = c.req.param('id')
  const { userName, userToken } = await c.req.json()

  // 1. 檢查房間與狀態 (保持不變)
  const group = await c.env.DB.prepare('SELECT status, payment_qr FROM groups WHERE id = ?').bind(groupId).first();
  if (!group) return c.json({ error: '房間不存在' }, 404);
  if (group.status !== 'LOCKED') return c.json({ error: '主揪尚未結單，請稍候' }, 403);
  if (!group.payment_qr) return c.json({ error: '主揪沒有上傳收款碼' }, 404);

  // 2. ★ 邏輯分拆：先檢查「有沒有下單」
  const order = await c.env.DB.prepare('SELECT user_token FROM orders WHERE group_id = ? AND user_name = ?')
    .bind(groupId, userName).first();

  // 情境 A: 根本沒找到這個名字的訂單
  if (!order) {
    return c.json({ error: '您未下訂單，因此無法查看收款碼' }, 403);
  }

  // 情境 B: 有訂單，但是 Token 不對 (可能是冒充者，或是使用者清除了瀏覽器紀錄導致 Token 變了)
  // 注意：從資料庫拿出來的 user_token 可能是 null (舊資料)，要防呆一下
  const dbToken = (order.user_token as string) || '';
  
  if (dbToken !== userToken) {
    return c.json({ error: '驗證失敗：您非該訂單建立者 (瀏覽器識別碼不符)，無法查看' }, 403);
  }

  // 情境 C: 驗證通過 (本人)
  return c.json({ payment_qr: group.payment_qr });
})

app.post('/api/orders', async (c) => {
  try {
    const { groupId, userName, items, userToken } = await c.req.json()
    
    // 1. 先抓房間資料出來檢查
    const group = await c.env.DB.prepare('SELECT status, deadline FROM groups WHERE id = ?').bind(groupId).first()
    
    if (!group) return c.json({ error: '房間不存在' }, 404)
    
    // 2. 檢查狀態是否已鎖定
    if (group.status === 'LOCKED') {
      return c.json({ error: '主揪已結單，無法再點餐囉！' }, 400)
    }

    // ★★★ 3. 新增：檢查是否超過截止時間 ★★★
    if (group.deadline && Date.now() > group.deadline) {
      return c.json({ error: '時間已到，停止收單！' }, 400)
    }
    
    const totalPrice = items.reduce((sum: number, item: any) => sum + (item.p || 0), 0)
    await c.env.DB.prepare(`INSERT INTO orders (group_id, user_name, items_json, total_price, created_at, is_paid, user_token) VALUES (?, ?, ?, ?, ?, 0, ?)`)
      .bind(groupId, userName, JSON.stringify(items), totalPrice, Date.now(), userToken).run()
    
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: '訂單提交失敗' }, 500)
  }
})

app.get('/api/groups/:id/orders', async (c) => {
  const groupId = c.req.param('id')
  const { results } = await c.env.DB.prepare(`SELECT * FROM orders WHERE group_id = ? ORDER BY created_at DESC`).bind(groupId).all()
  return c.json({ orders: results.map((order: any) => ({ ...order, items: JSON.parse(order.items_json) })) })
})

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const SEVEN_DAYS_AGO = Date.now() - 604800000;
    await env.DB.prepare('DELETE FROM orders WHERE created_at < ?').bind(SEVEN_DAYS_AGO).run();
    await env.DB.prepare('DELETE FROM groups WHERE created_at < ?').bind(SEVEN_DAYS_AGO).run();
  }
}