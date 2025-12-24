import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fromByteArray } from 'base64-js'

// 定義 Worker 的環境變數型別
type Bindings = {
  DB: D1Database
  GEMINI_API_KEY: string
  RATE_LIMITER: any // 需在 wrangler.toml 設定 [rate_limits]
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
  allowHeaders: ['Content-Type', 'Authorization', 'CF-Connecting-IP'], // 加上 IP header 允許
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

app.use('/api/*', async (c, next) => {
  return await next();
});

// --- Helper Functions ---

/**
 * 驗證 Cloudflare Turnstile Token
 * @param token 前端傳來的 token
 * @param secretKey Cloudflare Secret Key
 * @param ip 用戶 IP (選填，增加安全性)
 */
async function verifyTurnstile(token: string, secretKey: string, ip?: string) {
  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const result = await fetch(url, {
    body: formData,
    method: 'POST',
  });

  const outcome = await result.json() as any;
  return outcome.success; // true 代表驗證通過
}

// --- API 路由邏輯 ---

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

// ★★★ 核心修改：建立房間 API (包含 Rate Limit, Turnstile Verify, JoinCode Retry) ★★★
app.post('/api/groups', async (c) => {
  try {
    // 1. Rate Limiting (防刷)
    const ip = c.req.header('CF-Connecting-IP') || 'global';
    if (c.env.RATE_LIMITER) {
        const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
        if (!success) {
            return c.json({ error: '請求太頻繁，請稍後再試 (429)' }, 429);
        }
    }

    const formData = await c.req.parseBody()
    const imageFile = formData['image']
    const paymentQrFile = formData['paymentQr']
    const turnstileToken = formData['cf-turnstile-response']
    const deadlineStr = formData['deadline'] as string

    // 基本檢查
    if (!imageFile || !(imageFile instanceof File)) return c.json({ error: '請上傳圖片' }, 400)
    if (imageFile.size > 5 * 1024 * 1024) return c.json({ error: '圖片太大囉！請小於 5MB' }, 400)
    
    // 2. Turnstile 伺服器端驗證 (安全性)
    if (!turnstileToken || typeof turnstileToken !== 'string') {
        return c.json({ error: '請完成人機驗證' }, 400)
    }
    const isHuman = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, ip);
    if (!isHuman) {
        return c.json({ error: '人機驗證失敗，請重試' }, 403);
    }

    // Gemini 處理圖片
    const arrayBuffer = await imageFile.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const base64Image = fromByteArray(uint8Array)
    const apiKey = c.env.GEMINI_API_KEY
    if (!apiKey) return c.json({ error: 'Server Error: GEMINI_API_KEY not configured' }, 500)

    let paymentQrBase64 = null;
    if (paymentQrFile && paymentQrFile instanceof File) {
        if (paymentQrFile.size > 2 * 1024 * 1024) return c.json({ error: '收款碼圖片太大了，請小於 2MB' }, 400);
        const qrBuffer = await paymentQrFile.arrayBuffer();
        const qrUint8 = new Uint8Array(qrBuffer);
        paymentQrBase64 = `data:${paymentQrFile.type};base64,${fromByteArray(qrUint8)}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const prompt = `
    Role: Expert Menu Digitizer for Taiwanese Restaurants.
    Task: Extract menu data from the image into strict JSON.
    Language: Traditional Chinese (繁體中文).
    
    *** ANALYSIS STRATEGY ***
    1. **Matrix/Grid Layout:** If items (rows) share choices (columns) like "油麵/米粉/飯", create ONE item and put variants in "choices".
    2. **Drink Sizes:** Put M/L sizes in "options".
    3. **Global Extras:** Keywords "加料", "配料" go to "global_extras".
    
    *** JSON OUTPUT RULES ***
    Return ONLY a JSON object:
    {
      "global_extras": [ {"n": "Name", "p": Price} ],
      "categories": [
        {
          "name": "Category Name",
          "items": [
            {
              "n": "Item Name",
              "p": BasePrice (lowest),
              "options": [ {"name": "Spec", "price": Price} ],
              "choices": ["Variant1", "Variant2"]
            }
          ]
        }
      ]
    }
    - No markdown blocks.
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
    
    // 3. Join Code 防撞機制 (重試最多 5 次)
    let joinCode = '';
    let isUnique = false;
    let retryCount = 0;

    while (!isUnique && retryCount < 5) {
        joinCode = Math.floor(1000 + Math.random() * 9000).toString();
        // 檢查是否已存在
        const existing = await c.env.DB.prepare('SELECT 1 FROM groups WHERE join_code = ?').bind(joinCode).first();
        if (!existing) {
            isUnique = true;
        } else {
            retryCount++;
        }
    }

    if (!isUnique) {
        return c.json({ error: '系統繁忙 (代碼生成失敗)，請稍後再試' }, 500);
    }

    const deadline = deadlineStr && deadlineStr !== 'null' ? Number(deadlineStr) : null;

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

app.patch('/api/groups/:id/status', async (c) => {
  const groupId = c.req.param('id')
  const { status, extraFee, deadline } = await c.req.json() 
  
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
    has_payment_qr: !!group.payment_qr 
  })
})

app.post('/api/groups/:id/payment-qr', async (c) => {
  const groupId = c.req.param('id')
  const { userName, userToken } = await c.req.json()

  const group = await c.env.DB.prepare('SELECT status, payment_qr FROM groups WHERE id = ?').bind(groupId).first();
  if (!group) return c.json({ error: '房間不存在' }, 404);
  if (group.status !== 'LOCKED') return c.json({ error: '主揪尚未結單，請稍候' }, 403);
  if (!group.payment_qr) return c.json({ error: '主揪沒有上傳收款碼' }, 404);

  const order = await c.env.DB.prepare('SELECT user_token FROM orders WHERE group_id = ? AND user_name = ?')
    .bind(groupId, userName).first();

  if (!order) return c.json({ error: '您未下訂單，因此無法查看收款碼' }, 403);
  
  const dbToken = (order.user_token as string) || '';
  if (dbToken !== userToken) {
    return c.json({ error: '驗證失敗：您非該訂單建立者，無法查看' }, 403);
  }

  return c.json({ payment_qr: group.payment_qr });
})

app.post('/api/orders', async (c) => {
  try {
    // 4. Rate Limiting (防惡意刷單)
    const ip = c.req.header('CF-Connecting-IP') || 'global';
    if (c.env.RATE_LIMITER) {
        // 設定較寬鬆的限制，例如 10秒內 5次 (視 wrangler.toml 設定而定)
        const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
        if (!success) {
            return c.json({ error: '操作太快囉，休息一下 (429)' }, 429);
        }
    }

    const { groupId, userName, items, userToken } = await c.req.json()
    
    const group = await c.env.DB.prepare('SELECT status, deadline FROM groups WHERE id = ?').bind(groupId).first()
    
    if (!group) return c.json({ error: '房間不存在' }, 404)
    if (group.status === 'LOCKED') return c.json({ error: '主揪已結單，無法再點餐囉！' }, 400)
    if (group.deadline && Date.now() > group.deadline) return c.json({ error: '時間已到，停止收單！' }, 400)
    
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
  // ★★★ 資料清理排程 (7天) ★★★
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const SEVEN_DAYS_AGO = Date.now() - 604800000;
    
    console.log('[Cron] Starting cleanup for data older than 7 days...');

    // 1. 刪除過期訂單
    await env.DB.prepare('DELETE FROM orders WHERE created_at < ?').bind(SEVEN_DAYS_AGO).run();

    // 2. 刪除過期房間的參與者 (避免孤兒資料)
    // 邏輯：刪除 "建立時間超過7天的房間" 裡面的參與者
    await env.DB.prepare(`
        DELETE FROM participants 
        WHERE group_id IN (SELECT id FROM groups WHERE created_at < ?)
    `).bind(SEVEN_DAYS_AGO).run();

    // 3. 刪除過期房間
    await env.DB.prepare('DELETE FROM groups WHERE created_at < ?').bind(SEVEN_DAYS_AGO).run();
    
    console.log('[Cron] Cleanup completed.');
  }
}