import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RefreshCw, Trash2, Lock, FileSpreadsheet, 
  AlertCircle, User, Clock, Edit3, Save, XCircle, CheckCircle2, CircleDollarSign, Calculator,
  Timer, Plus, CalendarClock
} from 'lucide-react';
import * as XLSX from 'xlsx';

// 引入智慧輪詢 Hook
import { useSmartPolling } from '../hooks/useSmartPolling';

// --- 型別定義 ---
type Order = {
  id: number;
  user_name: string;
  items_json: string;
  total_price: number;
  created_at: number;
  is_paid?: number; 
};

type Participant = {
  user_name: string;
  last_seen: number;
};

type AggregatedItem = {
  n: string;
  p: number;
  note?: string;
  count: number;
  subtotal: number;
};

export default function HostDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // ★ 新增：專門控制旋轉鈕動畫
  const [isEditing, setIsEditing] = useState(false);
  const [editedMenu, setEditedMenu] = useState<any>(null);
  
  // Modal States
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  
  const [extraFeeInput, setExtraFeeInput] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const [customTimeInput, setCustomTimeInput] = useState('');

  const isHost = localStorage.getItem(`isHost-${id}`) === 'true';

  const aggregateItems = (items: any[]): AggregatedItem[] => {
    const grouped: { [key: string]: AggregatedItem } = {};
    items.forEach(item => {
      const key = `${item.n}-${item.p}-${item.note || ''}`;
      if (grouped[key]) {
        grouped[key].count += 1;
        grouped[key].subtotal += item.p;
      } else {
        grouped[key] = { n: item.n, p: item.p, note: item.note, count: 1, subtotal: item.p };
      }
    });
    return Object.values(grouped);
  };

  const payerCount = orders.length;
  const extraFeeTotal = roomInfo?.extra_fee || 0;
  const rawAvg = payerCount > 0 ? extraFeeTotal / payerCount : 0;
  const feePerPerson = Math.ceil(rawAvg / 5) * 5;

  const fetchData = useCallback(async (isManual: boolean = false) => {
    if (isManual) setIsRefreshing(true); // 手動點擊時開啟動畫
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      const roomRes = await fetch(`${apiUrl}/api/groups/${id}`);

      if (roomRes.status === 404) {
        navigate('/404', { replace: true });
        return;
      }

      if (!roomRes.ok) throw new Error('房間不存在');
      const roomData = await roomRes.json();
      setRoomInfo(roomData);

      const [ordersRes, participantsRes] = await Promise.all([
        fetch(`${apiUrl}/api/groups/${roomData.id}/orders`),
        fetch(`${apiUrl}/api/groups/${roomData.id}/participants`)
      ]);

      setOrders((await ordersRes.json()).orders || []);
      setParticipants((await participantsRes.json()).participants || []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 500); // 讓動畫轉完至少半秒
    }
  }, [id]);

  useSmartPolling(() => fetchData(false), 5000, true);

  // 倒數計時邏輯
  useEffect(() => {
    if (!roomInfo?.deadline || roomInfo.status === 'LOCKED') {
      setTimeLeft('');
      return;
    }
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = roomInfo.deadline - now;
      if (diff <= 0) {
        setTimeLeft('已截止');
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [roomInfo?.deadline, roomInfo?.status]);

  const handleUpdateDeadline = async (newTimestamp: number | null) => {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      await fetch(`${apiUrl}/api/groups/${roomInfo.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: newTimestamp })
      });
      setIsTimeModalOpen(false);
      fetchData(true);
    } catch (e) { alert('時間設定失敗'); }
  };

  const setDeadlineByMinutes = (minutes: number) => {
    const now = Date.now();
    const baseTime = (roomInfo?.deadline && roomInfo.deadline > now) ? roomInfo.deadline : now;
    handleUpdateDeadline(baseTime + minutes * 60 * 1000);
  };

  const setDeadlineByTime = () => {
    if (!customTimeInput) return;
    const [h, m] = customTimeInput.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    handleUpdateDeadline(target.getTime());
  };

  const handleExtendQuick = async () => {
    if (!roomInfo?.deadline) return;
    setDeadlineByMinutes(5);
  };

  const handleTogglePayment = async (orderId: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_paid: newStatus } : o));
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      await fetch(`${apiUrl}/api/orders/${orderId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: newStatus === 1 })
      });
    } catch (e) { alert('狀態更新失敗'); fetchData(true); }
  };

  const handleDeleteOrder = async (orderId: number, userName: string) => {
    if (!confirm(`確定要刪除 ${userName} 的訂單嗎？`)) return;
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      await fetch(`${apiUrl}/api/orders/${orderId}`, { method: 'DELETE' });
      fetchData(true); 
    } catch (e) { alert('刪除失敗'); }
  };

  const openLockModal = () => { setExtraFeeInput('0'); setIsLockModalOpen(true); };

  const confirmLock = async () => {
    if (!roomInfo) return;
    const fee = parseInt(extraFeeInput) || 0;
    if (!confirm(`確定要結單嗎？`)) return;
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      await fetch(`${apiUrl}/api/groups/${roomInfo.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LOCKED', extraFee: fee })
      });
      setIsLockModalOpen(false);
      fetchData(true);
    } catch (e) { alert('操作失敗'); }
  };

  const handleDeleteRoom = async () => {
    if (!confirm('確定要刪除房間嗎？')) return;
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      await fetch(`${apiUrl}/api/groups/${roomInfo.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'DELETED' }), headers: { 'Content-Type': 'application/json' }});
      localStorage.removeItem(`isHost-${id}`);
      navigate('/');
    } catch (e) { alert('操作失敗'); }
  };
  
  const startEditing = () => { if (!roomInfo?.menu) return; setEditedMenu(JSON.parse(JSON.stringify(roomInfo.menu))); setIsEditing(true); };
  const saveMenu = async () => { try { const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, ''); await fetch(`${apiUrl}/api/groups/${roomInfo.id}/menu`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menu: editedMenu }) }); setRoomInfo({ ...roomInfo, menu: editedMenu }); setIsEditing(false); alert('菜單更新成功！'); } catch (e) { alert('更新失敗'); } };

  const handleExportExcel = () => {
      if (orders.length === 0) return alert('目前沒有訂單可以匯出');
      const detailRows: any[] = [];
      orders.forEach(order => {
        try {
          const rawItems = JSON.parse(order.items_json);
          const items = aggregateItems(rawItems); 
          items.forEach((item) => {
            detailRows.push({ '姓名': order.user_name, '品項': item.n, '數量': item.count, '單價': item.p, '小計': item.subtotal, '備註': item.note || '', '狀態': order.is_paid ? '已付' : '未付' });
          });
        } catch (e) { console.error(e); }
      });
      const ws = XLSX.utils.json_to_sheet(detailRows);
      ws['!cols'] = [{wch: 15}, {wch: 30}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 20}, {wch: 10}];
      let currentRow = detailRows.length + 3;
      XLSX.utils.sheet_add_aoa(ws, [['--- 收款統計 (含運費分攤) ---']], { origin: `A${currentRow}` });
      currentRow++;
      XLSX.utils.sheet_add_aoa(ws, [['姓名', '餐點費', '運費/雜費', '應付總額', '付款狀態']], { origin: `A${currentRow}` });
      currentRow++;
      let grandTotal = 0; let paidTotal = 0;
      orders.forEach(order => {
        const finalAmount = order.total_price + feePerPerson;
        grandTotal += finalAmount;
        if(order.is_paid) paidTotal += finalAmount;
        XLSX.utils.sheet_add_aoa(ws, [[order.user_name, order.total_price, feePerPerson, finalAmount, order.is_paid ? '已付 ✅' : '未付 ❌']], { origin: `A${currentRow}` });
        currentRow++;
      });
      currentRow++; 
      XLSX.utils.sheet_add_aoa(ws, [['總計', '', '', grandTotal, `已收: ${paidTotal} / 未收: ${grandTotal - paidTotal}`]], { origin: `A${currentRow}` });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "訂單明細");
      XLSX.writeFile(wb, `點餐明細_${id}.xlsx`);
  };

  const OFFLINE_THRESHOLD = 30000; 
  const activeParticipants = participants.filter(p => (Date.now() - p.last_seen) < OFFLINE_THRESHOLD);
  const totalPrice = orders.reduce((sum, o) => sum + o.total_price, 0);
  const paidCount = orders.filter(o => o.is_paid).length;
  const pendingUsers = activeParticipants.filter(p => !orders.some(o => o.user_name.toLowerCase() === p.user_name.toLowerCase()));

  let statusText = '開放中';
  let statusColor = 'text-green-500';
  if (roomInfo?.status === 'LOCKED') {
    statusText = '已結單';
    statusColor = 'text-red-500';
  } else if (timeLeft === '已截止') {
    statusText = '已截止 (待結算)';
    statusColor = 'text-orange-500 font-black animate-pulse';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={40} className="text-orange-500 animate-spin" />
          <p className="text-gray-500 font-bold">正在讀取儀表板...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`/room/${id}`)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ArrowLeft size={20}/></button>
              <div>
                <h1 className="font-bold text-xl">{isHost ? '主揪儀表板' : '看看別人點什麼'}</h1>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span className={`font-bold ${statusColor}`}>{statusText}</span>
                  <span className="mx-1">|</span>
                  線上: <span className="font-bold text-orange-600">{activeParticipants.length}</span> 人
                </div>
              </div>
            </div>
            
            {/* 倒數計時顯示區 */}
            {isHost && roomInfo?.status !== 'LOCKED' && (
              <div className="flex items-center gap-2 bg-black/5 p-2 rounded-xl">
                 {roomInfo?.deadline ? (
                    <>
                      <div className="text-gray-900 font-black text-lg font-mono flex items-center gap-2 px-2">
                        <Timer size={18} className="text-orange-500"/>
                        {timeLeft}
                      </div>
                      <button onClick={handleExtendQuick} className="bg-white text-xs font-bold text-orange-600 px-2 py-1 rounded-lg border border-gray-200 shadow-sm hover:bg-orange-50 flex items-center gap-1" title="快速延長5分鐘">
                        <Plus size={12}/> 5分
                      </button>
                    </>
                 ) : (
                    <div className="text-gray-400 text-xs font-bold px-2 flex items-center gap-1">
                       <Clock size={14}/> 不限時
                    </div>
                 )}
              </div>
            )}

            {/* ★★★ 修復：旋轉鈕綁定 fetchData(true) ★★★ */}
            <button 
              onClick={() => fetchData(true)} 
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-full transition-transform active:scale-90"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {isHost ? (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button 
                onClick={() => { setCustomTimeInput(''); setIsTimeModalOpen(true); }}
                disabled={roomInfo?.status === 'LOCKED'}
                className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap hover:bg-blue-200 disabled:opacity-50"
              >
                <CalendarClock size={16} /> {roomInfo?.deadline ? '修改時間' : '設定結單'}
              </button>

              <button 
                onClick={openLockModal} 
                disabled={roomInfo?.status === 'LOCKED'} 
                className={`flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap disabled:opacity-50 ${timeLeft === '已截止' ? 'bg-orange-500 animate-bounce shadow-lg shadow-orange-200' : 'bg-gray-800'}`}
              >
                <Lock size={16} /> {timeLeft === '已截止' ? '結算運費並關閉' : '結單'}
              </button>

              <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap"><FileSpreadsheet size={16} /> 匯出</button>
              <button onClick={handleDeleteRoom} className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ml-auto"><Trash2 size={16} /> 刪除</button>
            </div>
          ) : (
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16}/> 訪客檢視模式</div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats 區塊 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="text-gray-400 text-sm">目前總金額 (含運費: ${extraFeeTotal})</div>
                <div className="text-4xl font-bold mt-1">${totalPrice + extraFeeTotal}</div>
              </div>
              <div className="mt-4 text-sm opacity-70 flex justify-between">
                <span>共 {orders.length} 筆訂單</span>
                <span className="font-bold text-green-400">{paidCount} 人已付款</span>
              </div>
            </div>

            {pendingUsers.length > 0 ? (
            <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6">
                <h3 className="text-orange-800 font-bold text-sm flex items-center gap-2 mb-3">
                  <Clock size={16} /> 還在看菜單 ({pendingUsers.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                {pendingUsers.map((u, i) => (
                    <span key={i} className="bg-white text-gray-600 px-3 py-1 rounded-full text-xs border border-orange-100 font-medium shadow-sm animate-pulse">
                      {u.user_name}
                    </span>
                ))}
                </div>
            </div>
            ) : (
              <div className="bg-green-50 border border-green-100 rounded-3xl p-6 flex items-center justify-center text-green-700 font-bold">
                 所有人都點完餐了！ 🎉
              </div>
            )}
        </div>

        {/* 菜單編輯區 */}
        {isHost && roomInfo?.menu && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><Edit3 size={18}/> 菜單管理</h2>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                       <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-1"><XCircle size={14}/> 取消</button>
                       <button onClick={saveMenu} className="px-3 py-1.5 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white shadow-md flex items-center gap-1"><Save size={14}/> 儲存</button>
                    </>
                  ) : (
                    <button onClick={startEditing} className="px-3 py-1.5 rounded-lg text-sm bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold">修改價格/品項</button>
                  )}
                </div>
             </div>
             
             {isEditing ? (
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                  {editedMenu?.categories?.map((cat: any, catIdx: number) => (
                    <div key={catIdx} className="bg-gray-50 p-4 rounded-xl">
                      <input value={cat.name} onChange={(e) => { const newMenu = JSON.parse(JSON.stringify(editedMenu)); newMenu.categories[catIdx].name = e.target.value; setEditedMenu(newMenu); }} className="font-bold text-orange-600 mb-2 bg-transparent border-b border-orange-200 w-full focus:outline-none" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cat.items.map((item: any, itemIdx: number) => (
                          <div key={itemIdx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                             <input value={item.n} onChange={(e) => { const newMenu = JSON.parse(JSON.stringify(editedMenu)); newMenu.categories[catIdx].items[itemIdx].n = e.target.value; setEditedMenu(newMenu); }} className="border rounded p-1 w-full text-sm" placeholder="品項名稱"/>
                             <input type="number" value={item.p} onChange={(e) => { const newMenu = JSON.parse(JSON.stringify(editedMenu)); newMenu.categories[catIdx].items[itemIdx].p = Number(e.target.value); setEditedMenu(newMenu); }} className="border rounded p-1 w-20 text-right text-sm" placeholder="價格"/>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
             ) : (
               <div className="text-sm text-gray-400 text-center py-2 bg-gray-50 rounded-xl">點擊上方「修改」按鈕可修正菜單錯誤</div>
             )}
          </div>
        )}

        {/* 訂單列表 */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-500 text-sm uppercase tracking-wider">訂單明細</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => (
              <div key={order.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all hover:shadow-md relative group ${order.is_paid ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
                {isHost && (
                  <button onClick={() => handleTogglePayment(order.id, order.is_paid || 0)} className={`absolute top-4 right-4 p-1.5 rounded-full transition-all flex items-center gap-1 text-xs font-bold shadow-sm ${order.is_paid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`} title={order.is_paid ? "標記為未付" : "標記為已付"}>
                    {order.is_paid ? (<>已付 <CheckCircle2 size={16} className="fill-green-600 text-white" /></>) : (<>未付 <CircleDollarSign size={16} /></>)}
                  </button>
                )}
                <div className="flex justify-between items-center border-b border-gray-50 pb-2 mb-2 pr-24">
                  <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <User size={16} className={order.is_paid ? "text-green-600" : "text-gray-400"} />
                    {order.user_name}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {aggregateItems(JSON.parse(order.items_json)).map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600 flex justify-between items-start">
                      <div className="max-w-[80%]">
                        <span>{item.n}</span>
                        {item.count > 1 && (<span className="ml-2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">x{item.count}</span>)}
                        {item.note && <span className="text-xs text-gray-400 block">({item.note})</span>}
                      </div>
                      <span className="text-gray-400 min-w-[3rem] text-right font-medium">${item.subtotal}</span>
                    </div>
                  ))}
                  {feePerPerson > 0 && (
                    <div className="text-sm text-orange-600 flex justify-between items-center pt-1 border-t border-dashed border-gray-200 mt-1">
                      <span>+ 運費/雜費</span>
                      <span className="font-bold">${feePerPerson}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     {isHost && (
                       <button onClick={() => handleDeleteOrder(order.id, order.user_name)} className="text-gray-300 p-1.5 -ml-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors" title="刪除訂單">
                         <Trash2 size={16} />
                       </button>
                     )}
                     <div className="text-xs text-gray-400">總計</div>
                   </div>
                   <div className={`font-black text-lg ${order.is_paid ? 'text-green-600' : 'text-gray-900'}`}>${order.total_price + feePerPerson}</div>
                </div>
              </div>
            ))}
          </div>
          {orders.length === 0 && <div className="text-center text-gray-400 py-10">尚無訂單</div>}
        </div>
      </div>

      {isLockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2"><Calculator size={24} className="text-orange-500"/> 設定額外費用</h3>
            <p className="text-gray-500 text-sm mb-4">輸入運費、折扣或雜費，系統會自動幫你平分給所有已點餐的人 ({orders.length} 人)。</p>
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-gray-400 uppercase">總額外費用</label>
              <input autoFocus type="number" value={extraFeeInput} onChange={e => setExtraFeeInput(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold text-gray-800 focus:ring-2 focus:ring-orange-200 outline-none" placeholder="0" />
              <div className="text-right text-sm text-orange-600 font-bold">每人分攤: ${orders.length > 0 ? Math.ceil((parseInt(extraFeeInput) || 0) / orders.length) : 0}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsLockModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200">取消</button>
              <button onClick={confirmLock} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:opacity-80">確認結單</button>
            </div>
          </div>
        </div>
      )}

      {/* 時間設定 Modal */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CalendarClock size={24} className="text-blue-500"/> 設定自動結單
            </h3>
            <p className="text-gray-500 text-sm mb-4">系統會在時間到時自動顯示「已截止」並停止收單。</p>

            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setDeadlineByMinutes(15)} className="py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">+15 分鐘</button>
                  <button onClick={() => setDeadlineByMinutes(30)} className="py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">+30 分鐘</button>
               </div>

               <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">或指定今日時間</label>
                  <div className="flex gap-2">
                     <input 
                       type="time" 
                       value={customTimeInput} 
                       onChange={e => setCustomTimeInput(e.target.value)}
                       className="flex-1 bg-white p-2 rounded-lg font-bold text-lg border border-gray-300 outline-none focus:border-blue-500"
                     />
                     <button onClick={setDeadlineByTime} disabled={!customTimeInput} className="bg-black text-white px-4 rounded-lg font-bold text-sm disabled:opacity-50">確認</button>
                  </div>
               </div>

               {/* ★★★ 修復：移除時間限制將傳送 null ★★★ */}
               {roomInfo?.deadline && (
                 <button 
                  onClick={() => handleUpdateDeadline(null)} 
                  className="w-full py-2 text-red-500 text-sm font-bold hover:bg-red-50 rounded-xl transition-colors"
                 >
                    移除時間限制 (變更為不限時)
                 </button>
               )}
            </div>

            <button onClick={() => setIsTimeModalOpen(false)} className="w-full mt-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200">
               取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}