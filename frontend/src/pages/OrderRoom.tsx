import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Minus, X, Coffee, Utensils, ShoppingBag, 
  ChevronRight, Search, Flame, CheckCircle2, PenSquare, Trash2,
  UserCheck, AlertTriangle, QrCode, Clock, Loader2, Wallet
} from 'lucide-react';
import QRCode from "react-qr-code";

// 引入自定義 Hooks
import { useCart, type CartItem } from '../hooks/useCart';
import { useSmartPolling } from '../hooks/useSmartPolling';

// --- UI 專用型別定義 ---
type ItemOption = { name: string; price: number };
type ExtraOption = { n: string; p: number };
type MenuItem = { 
  n: string; p: number; is_drink: boolean; spicy?: boolean; description?: string; 
  options: ItemOption[]; choices?: string[]; 
};
type Category = { name: string; items: MenuItem[]; };

const SUGAR_LEVELS = ['正常糖', '少糖', '半糖', '微糖', '無糖'];
const ICE_LEVELS = ['正常冰', '少冰', '微冰', '去冰', '溫', '熱'];

export default function OrderRoom() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  // --- 1. 使用 Hooks 管理核心邏輯 ---
  // 購物車邏輯 (自動同步 LocalStorage)
  const { cart, addToCart, removeFromCart, clearCart, totalCartPrice, totalCartCount } = useCart(id);
  
  // --- 2. 頁面狀態管理 ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalExtras, setGlobalExtras] = useState<ExtraOption[]>([]);
  const [roomStatus, setRoomStatus] = useState<'OPEN' | 'LOCKED' | 'DELETED'>('OPEN');
  
  const isHost = localStorage.getItem(`isHost-${id}`) === 'true';
  
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  
  // User Token (資安驗證用)
  const [userToken] = useState(() => {
    let token = localStorage.getItem('userToken');
    if (!token) { token = crypto.randomUUID(); localStorage.setItem('userToken', token); }
    return token;
  });

  const [isNameSet, setIsNameSet] = useState(() => !!localStorage.getItem('userName'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [existingOrders, setExistingOrders] = useState<any[]>([]);

  // Item Modal State
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [count, setCount] = useState(1);
  const [customOption, setCustomOption] = useState<ItemOption | null>(null);
  const [customChoice, setCustomChoice] = useState<string>(''); 
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [customSugar, setCustomSugar] = useState('正常糖');
  const [customIce, setCustomIce] = useState('正常冰');
  const [customNote, setCustomNote] = useState('');
  
  // Manual & Other Modals State
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualCount, setManualCount] = useState(1);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time & QR Security State
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ str: string, isUrgent: boolean } | null>(null);
  const [realGroupId, setRealGroupId] = useState<string>(''); 
  const [hasPaymentQr, setHasPaymentQr] = useState(false);    
  const [paymentQrImage, setPaymentQrImage] = useState<string | null>(null); 
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isFetchingQr, setIsFetchingQr] = useState(false);
  
  // 儲存房間資訊 (為了拿 extra_fee)
  const [roomInfo, setRoomInfo] = useState<any>(null);

  // --- 3. 核心 API 請求與輪詢邏輯 ---

  // 封裝資料抓取邏輯 (使用 useCallback 避免不必要的重建)
  const fetchData = useCallback(async () => {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      
      // A. 抓房間資訊
      const roomRes = await fetch(`${apiUrl}/api/groups/${id}`);
      if (!roomRes.ok) {
        if (roomRes.status === 404) {
          // 如果後端回傳 404，代表房間代碼無效或已刪除
          navigate('/404', { replace: true }); 
          return;
        }
        throw new Error('無法讀取房間資料');
      }
      
      const roomData = await roomRes.json();
      setRoomInfo(roomData);
      setRoomStatus(roomData.status);
      setHasPaymentQr(roomData.has_payment_qr);
      setRealGroupId(roomData.id);

      // B. 解析菜單 (只在第一次或分類為空時執行，避免畫面重繪閃爍)
      // 注意：這裡使用 functional update 或檢查當前 categories 狀態會比較好
      // 但因為 categories 在 dependency，所以我們用 categories.length 檢查
      if (categories.length === 0) {
          if (roomData.menu.global_extras) setGlobalExtras(roomData.menu.global_extras);
          if (roomData.deadline) setDeadline(roomData.deadline);
          
          let parsedCategories: Category[] = roomData.menu.categories || [{ name: '全部品項', items: roomData.menu.items }];
          
          // 確保每個 item 都有 options
          parsedCategories.forEach(cat => {
            cat.items = cat.items.map((item: any) => ({
              ...item,
              options: (item.options && item.options.length > 0) ? item.options : [{ name: '單一規格', price: item.p || 0 }]
            }));
          });
          
          setCategories(parsedCategories);
          if (parsedCategories.length > 0) setActiveCategory(parsedCategories[0].name);
      }

      // C. 抓現有訂單
      if (roomData.id) {
          const oRes = await fetch(`${apiUrl}/api/groups/${roomData.id}/orders`);
          if (oRes.ok) {
             const ordersData = await oRes.json();
             setExistingOrders(ordersData.orders || []);
          }
      }
    } catch (e) { 
      if(loading) setError('讀取失敗或房間已關閉'); 
    } finally { 
      setLoading(false); 
    }
  }, [id, categories.length, loading]); // 依賴項

  // ★★★ 使用 Smart Polling (智慧輪詢) ★★★
  // 每 4 秒更新一次，背景自動暫停
  useSmartPolling(fetchData, 4000, true);

  // 心跳機制 (維持在線狀態) - 這部分不需要太頻繁，保持原本 useEffect 即可
  useSmartPolling(async () => {
    if (isNameSet && userName && id) {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
        await fetch(`${apiUrl}/api/groups/${id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userName }) });
      } catch (e) { console.error('心跳發送失敗', e); }
    }
  }, 10000, isNameSet && roomStatus !== 'LOCKED'); // 10秒一次心跳


  // --- 4. 倒數計時邏輯 (純前端計算) ---
  // 使用 Smart Polling 也可以，或者保留 setInterval (因為倒數需要每秒跳)
  // 由於這是 UI 顯示，建議保留 setInterval 以確保秒數平滑
  useMemo(() => {
    if (roomStatus === 'LOCKED') {
      setTimeLeft(null);
      return;
    }
    if (!deadline) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = deadline - now;
      
      if (diff <= 0) {
        setTimeLeft({ str: '已截止', isUrgent: false });
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ str: `剩餘 ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, isUrgent: diff < 5 * 60 * 1000 });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, roomStatus]);


  // --- 5. 互動處理邏輯 ---

  const isTimeUp = timeLeft?.str === '已截止' || roomStatus === 'LOCKED';
  const isSubmitDisabled = isSubmitting || cart.length === 0 || isTimeUp;

  const fetchAndShowQr = async () => {
    if (paymentQrImage) { setIsPayModalOpen(true); return; }
    setIsFetchingQr(true);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/groups/${realGroupId}/payment-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userToken })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '無法讀取收款碼');
        return;
      }
      const data = await res.json();
      setPaymentQrImage(data.payment_qr);
      setIsPayModalOpen(true);
    } catch (e) { alert('讀取失敗，請確認網路'); } finally { setIsFetchingQr(false); }
  };

  const handleStartOrder = async () => { 
    if (!userName.trim()) return; 
    setIsCheckingName(true); 
    setNameError(null); 
    try { 
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, ''); 
        // 檢查名字是否重複 (可選)
        const roomRes = await fetch(`${apiUrl}/api/groups/${id}`); 
        const roomData = await roomRes.json(); 
        const participantsRes = await fetch(`${apiUrl}/api/groups/${roomData.id}/participants`); 
        const data = await participantsRes.json(); 
        const exists = data.participants.some((p: any) => p.user_name.toLowerCase() === userName.trim().toLowerCase()); 
        
        if (exists) { 
            setNameError('這個名字已經有人使用了'); 
            setIsCheckingName(false); 
        } else { 
            localStorage.setItem('userName', userName); 
            setIsNameSet(true); 
        } 
    } catch (e) { 
        // 離線或錯誤時允許進入
        localStorage.setItem('userName', userName); 
        setIsNameSet(true); 
    } 
  };

  const handleForceEnter = () => { localStorage.setItem('userName', userName); setIsNameSet(true); setNameError(null); };
  
  const getOrderSummary = (itemsJson: string) => { try { const items = JSON.parse(itemsJson); const counts: Record<string, number> = {}; items.forEach((item: any) => { const name = item.n.split(' (')[0]; counts[name] = (counts[name] || 0) + 1; }); return Object.entries(counts).map(([name, count]) => count > 1 ? `${name} x${count}` : name).join(', '); } catch { return ''; } };
  
  // Modal Openers
  const openItemModal = (item: MenuItem) => { 
      if (isTimeUp) return; 
      setSelectedItem(item); setCount(1); setSelectedExtras([]); 
      if (item.options?.length) setCustomOption(item.options[0]); 
      setCustomChoice(item.choices?.[0] || ''); 
      setCustomSugar('正常糖'); setCustomIce('正常冰'); setCustomNote(''); 
  };
  
  const openManualModal = () => { if (isTimeUp) return; setManualName(''); setManualPrice(''); setManualNote(''); setManualCount(1); setIsManualOpen(true); };

  // Cart Actions (Delegated to Hook)
  const confirmAddToCart = () => { 
      if (!selectedItem || !customOption) return; 
      const unitPrice = customOption.price + selectedExtras.reduce((s, e) => s + e.p, 0); 
      
      const newItem: CartItem = { 
          id: crypto.randomUUID(), 
          n: selectedItem.n, 
          price: unitPrice, 
          count, 
          optionName: customOption.name, 
          choice: customChoice, 
          extras: selectedExtras, 
          sugar: selectedItem.is_drink ? customSugar : undefined, 
          ice: selectedItem.is_drink ? customIce : undefined, 
          note: customNote, 
          owner: userName 
      }; 
      
      addToCart(newItem); 
      setSelectedItem(null); 
  };
  
  const confirmAddManualItem = () => { 
      if (!manualName.trim() || !manualPrice) return; 
      addToCart({ 
          id: crypto.randomUUID(), 
          n: manualName, 
          price: Number(manualPrice), 
          count: manualCount, 
          optionName: '手動輸入', 
          note: manualNote, 
          owner: userName 
      }); 
      setIsManualOpen(false); 
  };

  const handleCopyOrder = (orderItemsJson: string) => { 
      if (isTimeUp) return; 
      if(!confirm('確定要複製這張訂單的內容嗎？(會加入目前的購物車)')) return; 
      try { 
          const items = JSON.parse(orderItemsJson); 
          items.forEach((item: any) => {
              addToCart({ 
                  id: crypto.randomUUID(), 
                  n: item.n, 
                  price: item.p, 
                  count: 1, 
                  optionName: '跟單', 
                  note: item.note || '', 
                  owner: userName 
              });
          });
          alert('已加入購物車！'); 
      } catch(e) { console.error(e); alert('複製失敗'); } 
  };
  
  const handleSubmitOrder = async () => { 
      if (isTimeUp) return alert('已停止收單'); 
      if (cart.length === 0) return; 
      setIsSubmitting(true); 
      try { 
          const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, ''); 
          
          // 再檢查一次狀態
          const roomRes = await fetch(`${apiUrl}/api/groups/${id}`); 
          const roomData = await roomRes.json(); 
          if (roomData.status === 'LOCKED') throw new Error('主揪剛剛結單了'); 
          
          // 轉換格式給後端
          const payloadItems = cart.flatMap(item => { 
              if (item.optionName === '跟單' || item.optionName === '手動輸入') { 
                  return Array(item.count).fill({ n: item.n + (item.note ? ` (備註:${item.note})` : ''), p: item.price }); 
              } 
              const extrasStr = item.extras?.length ? `[加:${item.extras.map(e => e.n).join(',')}]` : ''; 
              return Array(item.count).fill({ n: `${item.n} (${item.optionName}) ${extrasStr} ${item.choice ? `[${item.choice}]` : ''} ${item.sugar || ''} ${item.ice || ''} ${item.note ? `(備註:${item.note})` : ''}`, p: item.price }); 
          }); 
          
          const res = await fetch(`${apiUrl}/api/orders`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ groupId: roomData.id, userName, items: payloadItems, userToken }) 
          }); 
          
          if (!res.ok) throw new Error('送出失敗'); 
          
          alert('訂單送出成功！'); 
          clearCart(); // 使用 Hook 清空
          setIsCartOpen(false); 
      } catch (e) { alert(e instanceof Error ? e.message : '錯誤'); } finally { setIsSubmitting(false); } 
  };
  
  // 計算過濾後的商品
  const filteredItems = useMemo(() => { 
      const items = searchQuery 
          ? categories.flatMap(c => c.items) 
          : (categories.find(c => c.name === activeCategory)?.items || []); 
      return searchQuery ? items.filter(i => i.n.includes(searchQuery)) : items; 
  }, [activeCategory, categories, searchQuery]);

  const currentItemTotalPrice = ((customOption?.price || 0) + selectedExtras.reduce((s, e) => s + e.p, 0)) * count;
  
  // 運費計算 (UI顯示用)
  const totalOrderCount = existingOrders.length;
  const extraFeeTotal = roomInfo?.extra_fee || 0;
  const rawAvg = totalOrderCount > 0 ? extraFeeTotal / totalOrderCount : 0;
  const feePerPerson = Math.ceil(rawAvg / 5) * 5;
  const myOrders = existingOrders.filter(o => o.user_name === userName);
  const myOrderTotal = myOrders.reduce((sum, o) => sum + o.total_price, 0);
  const myFinalTotal = myOrderTotal + (feePerPerson * myOrders.length);

  // --- Sub Component: Cart Content ---
  const CartContent = () => ( 
    <> 
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"> 
        {cart.map(item => ( 
            <div key={item.id} className="flex justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100"> 
                <div> 
                    <div className="font-bold text-gray-800 flex items-center gap-2">{item.n} {item.count > 1 && <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">x{item.count}</span>}</div> 
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1"> 
                        <span className="bg-gray-100 px-1 rounded">{item.optionName}</span> 
                        {item.extras?.map(e => <span key={e.n} className="bg-orange-50 text-orange-700 px-1 rounded">+ {e.n}</span>)} 
                        {item.sugar && <span className="bg-blue-50 text-blue-600 px-1 rounded">{item.sugar}</span>} 
                        {item.ice && <span className="bg-cyan-50 text-cyan-600 px-1 rounded">{item.ice}</span>} 
                        {item.note && <span className="text-gray-400">({item.note})</span>} 
                    </div> 
                </div> 
                <div className="flex flex-col items-end justify-between">
                    <span className="font-bold">${item.price * item.count}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div> 
            </div> 
        ))} 
        {cart.length === 0 && <div className="text-center text-gray-400 py-10">購物車是空的 🛒</div>} 
      </div> 
      <div className="bg-white p-6 border-t border-gray-100"> 
        <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-bold">總計金額</span><span className="text-3xl font-black text-gray-900">${totalCartPrice}</span></div> 
        <button 
          onClick={handleSubmitOrder} 
          disabled={isSubmitDisabled} 
          className={`w-full text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg ${isSubmitDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`}
        > 
          {roomStatus === 'LOCKED' ? '已結單' : isTimeUp ? '時間已到 (停止收單)' : isSubmitting ? '傳送中...' : '確認送出 🚀'} 
        </button> 
      </div> 
    </> 
  );

  // --- Render Logic ---

  if (loading) return <div className="min-h-screen flex justify-center items-center text-orange-500 animate-pulse">載入美味菜單中...</div>;
  if (error) return <div className="min-h-screen flex flex-col justify-center items-center text-gray-500"><p>{error}</p></div>;
  
  // Name Entry Modal (保持不變)
  if (!isNameSet) { return ( <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md"> <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95"> <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4"> <UserCheck size={40} className="text-orange-500" /> </div> <div><h2 className="text-2xl font-bold text-gray-800">歡迎點餐</h2><p className="text-gray-500 text-sm mt-1">請輸入你的暱稱，方便主揪分餐</p></div> <div className="relative"> <input autoFocus type="text" value={userName} onChange={(e) => { setUserName(e.target.value); setNameError(null); }} onKeyDown={(e) => e.key === 'Enter' && handleStartOrder()} placeholder="輸入你的暱稱" className={`w-full text-center text-xl font-bold py-3 border-b-2 bg-transparent focus:outline-none transition-colors ${nameError ? 'border-red-500 text-red-600' : 'border-orange-100 focus:border-orange-500'}`} /> {nameError && (<div className="text-red-500 text-xs mt-2 flex items-center justify-center gap-1"><AlertTriangle size={12} /> {nameError}</div>)} </div> {nameError ? ( <div className="flex gap-2"> <button onClick={() => { setUserName(''); setNameError(null); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">換個名字</button> <button onClick={handleForceEnter} className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700">是我本人</button> </div> ) : ( <button onClick={handleStartOrder} disabled={!userName.trim() || isCheckingName} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">{isCheckingName ? '檢查中...' : '開始點餐'}</button> )} </div> </div> ); }

  return (
    <div className="min-h-screen bg-[#F3F4F6] lg:flex lg:justify-center">
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 20px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #1f2937; }`}</style>
      <div className="w-full max-w-7xl lg:flex lg:gap-8 lg:p-8">
        <div className="flex-1 min-w-0 bg-white lg:rounded-3xl lg:shadow-xl lg:overflow-hidden flex flex-col h-screen lg:h-[calc(100vh-4rem)]">
          <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm lg:shadow-none">
            {/* Header 狀態列 */}
            {roomStatus === 'LOCKED' ? (
              <div className="bg-red-500 text-white text-center text-xs font-bold py-1 flex items-center justify-center gap-2">
                <span>⛔ 主揪已結單</span>
              </div>
            ) : timeLeft ? (
              <div className={`text-center text-xs font-bold py-1 flex items-center justify-center gap-1 transition-colors ${timeLeft.str === '已截止' ? 'bg-gray-800 text-white' : timeLeft.isUrgent ? 'bg-red-500 text-white animate-pulse' : 'bg-green-500 text-white'}`}>
                 {timeLeft.str === '已截止' ? <Clock size={12}/> : timeLeft.isUrgent ? <Flame size={12} fill="currentColor"/> : <Clock size={12}/>}
                 {timeLeft.str === '已截止' 
                    ? '⏳ 時間到，已截止收單 (等待主揪結算...)' 
                    : timeLeft.isUrgent 
                        ? `🔥 最後 ${timeLeft.str.replace('剩餘 ', '')}，快點餐！` 
                        : timeLeft.str
                 }
              </div>
            ) : null}

            {/* Header Content */}
            <div className="px-4 py-3 flex justify-between items-center">
              <div><div className="text-xs text-gray-400 font-bold">Room Code</div><div className="text-xl font-black text-gray-800 tracking-wider">{id}</div></div>
              <div className="flex gap-2 items-center">
                <button onClick={() => navigate(`/room/${id}/host`)} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${isHost ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{isHost ? '主揪儀表板' : '看看別人'}</button>
                <button onClick={() => setIsQrOpen(true)} className="bg-gray-100 text-gray-600 p-1.5 rounded-full hover:bg-gray-200 transition-colors" title="顯示房間 QR Code"><QrCode size={20} /></button>
                <div className="text-sm font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100">{userName}</div>
              </div>
            </div>

            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="搜尋想吃的..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
                {searchQuery && (<button onClick={()=>setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16}/></button>)}
              </div>
            </div>

            {!searchQuery && (
              <div className="flex overflow-x-auto px-4 py-2 gap-2 no-scrollbar border-t border-gray-50">
                {categories.map(cat => (<button key={cat.name} onClick={() => setActiveCategory(cat.name)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategory === cat.name ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>{cat.name}</button>))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            {/* 置頂帳單卡片 */}
            {roomStatus === 'LOCKED' && hasPaymentQr && myOrders.length > 0 && (
              <div className="mb-6 bg-white rounded-2xl p-5 border-2 border-orange-100 shadow-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10">
                   <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 mb-2">👋 嗨 {userName}，結單囉！</h3>
                   <div className="text-gray-500 text-sm mb-4">
                     餐點 ${myOrderTotal} + 運費 ${feePerPerson * myOrders.length}
                     <div className="mt-1 flex items-baseline gap-2"><span>應付總額:</span><span className="font-black text-3xl text-gray-900">${myFinalTotal}</span></div>
                   </div>
                   <button onClick={fetchAndShowQr} disabled={isFetchingQr} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-gray-200 hover:bg-black active:scale-[0.98] transition-all">
                     {isFetchingQr ? <Loader2 className="animate-spin" /> : <Wallet size={20} />} {isFetchingQr ? '驗證中...' : '顯示收款 QR Code'}
                   </button>
                </div>
              </div>
            )}

            {existingOrders.length > 0 && !searchQuery && (
              <div className="mb-6 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-sm"><Flame size={16}/> 大家都在點什麼</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {existingOrders.map((order) => (
                    <div key={order.id} className="min-w-[220px] bg-white p-3 rounded-xl shadow-sm border border-orange-100 flex flex-col justify-between">
                      <div><div className="font-bold text-sm text-gray-800 mb-1">{order.user_name}</div><div className="text-xs text-gray-500 line-clamp-2 mb-2">{getOrderSummary(order.items_json)}</div></div>
                      <button onClick={() => handleCopyOrder(order.items_json)} className={`w-full text-xs font-bold py-1.5 rounded-lg border whitespace-nowrap transition-colors ${isTimeUp ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200'}`}>+1 跟單 (${order.total_price})</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-24 lg:pb-0">
              {filteredItems.map((item, idx) => (
                <div key={idx} onClick={() => openItemModal(item)} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start transition-all hover:shadow-md cursor-pointer ${isTimeUp && 'opacity-60 grayscale pointer-events-none'}`}>
                  <div className="flex gap-4 items-start">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.is_drink ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>{item.is_drink ? <Coffee size={24} /> : <Utensils size={24} />}</div>
                      {item.spicy && <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 border-2 border-white"><Flame size={10} fill="currentColor" /></div>}
                    </div>
                    <div><h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{item.n}</h3>{item.description && <p className="text-xs text-gray-400 line-clamp-1 mb-1">{item.description}</p>}<p className="text-gray-900 font-bold text-sm">${item.options[0].price}</p></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-orange-500 hover:text-white"><Plus size={18} /></div>
                </div>
              ))}
              {!isTimeUp && ( <button onClick={openManualModal} className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 text-gray-400 font-bold flex flex-col items-center gap-2 hover:border-orange-400 hover:text-orange-500 transition-colors h-full justify-center min-h-[100px]"><PenSquare size={24} /> 找不到？手動輸入</button> )}
            </div>
            {filteredItems.length === 0 && <div className="text-center text-gray-400 py-12">找不到符合的餐點 🍜</div>}
          </div>
        </div>
        <div className="hidden lg:flex w-96 bg-white rounded-3xl shadow-xl flex-col h-[calc(100vh-4rem)] sticky top-8 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="text-orange-500"/> 購物車</h3></div>
          <CartContent />
        </div>
      </div>
      {cart.length > 0 && ( <div className="lg:hidden fixed bottom-6 left-4 right-4 z-30 animate-in slide-in-from-bottom-4"> <button onClick={() => setIsCartOpen(true)} className="w-full bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center"> <div className="flex items-center gap-4"><div className="bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">{totalCartCount}</div><div className="flex flex-col items-start"><span className="text-xs text-gray-400 font-medium">預計</span><span className="font-bold text-xl">${totalCartPrice}</span></div></div> <div className="flex items-center gap-1 font-bold text-orange-400">去結帳 <ChevronRight size={18} /></div> </button> </div> )}
      
      {/* Item Modal */}
      {selectedItem && ( <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={() => setSelectedItem(null)}> <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 pb-8 md:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-start border-b border-gray-100 pb-4 shrink-0"> <div><h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{selectedItem.n} {selectedItem.spicy && <Flame size={20} className="text-red-500" fill="currentColor"/>}</h3></div> <button onClick={() => setSelectedItem(null)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button> </div> <div className="space-y-6 overflow-y-auto custom-scrollbar px-1 flex-1 py-2"> 
          <div className="space-y-3"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">規格</label><div className="flex flex-wrap gap-2">{selectedItem.options.map(opt => (<button key={opt.name} onClick={() => setCustomOption(opt)} className={`px-4 py-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${customOption?.name === opt.name ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500' : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}>{opt.name === '單一規格' ? '一份' : opt.name} <span className="bg-white/50 px-1.5 rounded text-xs opacity-70 border border-black/5">${opt.price}</span></button>))}</div></div> {selectedItem.is_drink && globalExtras.length > 0 && (<div className="space-y-3"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">✨ 加點配料</label><div className="grid grid-cols-2 gap-2">{globalExtras.map(extra => (<button key={extra.n} onClick={() => setSelectedExtras(prev => prev.find(e => e.n === extra.n) ? prev.filter(e => e.n !== extra.n) : [...prev, extra])} className={`px-4 py-3 rounded-xl border text-sm font-bold flex justify-between items-center ${selectedExtras.some(e=>e.n===extra.n) ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1' : 'border-gray-100 text-gray-600'}`}><span className="flex items-center gap-2">{selectedExtras.some(e=>e.n===extra.n) && <CheckCircle2 size={14} />}{extra.n}</span><span className="text-xs text-gray-400">+${extra.p}</span></button>))}</div></div>)} {selectedItem.is_drink && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-3"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">甜度</label><div className="flex flex-wrap gap-2">{SUGAR_LEVELS.map(l => <button key={l} onClick={() => setCustomSugar(l)} className={`px-3 py-2 rounded-lg text-sm border ${customSugar === l ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-gray-100 bg-white text-gray-600'}`}>{l}</button>)}</div></div><div className="space-y-3"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">冰塊</label><div className="flex flex-wrap gap-2">{ICE_LEVELS.map(l => <button key={l} onClick={() => setCustomIce(l)} className={`px-3 py-2 rounded-lg text-sm border ${customIce === l ? 'border-cyan-500 bg-cyan-50 text-cyan-700 font-bold' : 'border-gray-100 bg-white text-gray-600'}`}>{l}</button>)}</div></div></div>)} {selectedItem.choices?.length ? (<div className="space-y-3"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">選項</label><div className="flex flex-wrap gap-2">{selectedItem.choices.map(c => <button key={c} onClick={() => setCustomChoice(c)} className={`px-4 py-2 rounded-xl border text-sm font-bold ${customChoice === c ? 'border-blue-500 bg-blue-50 text-blue-600 ring-1' : 'border-gray-100 text-gray-600'}`}>{c}</button>)}</div></div>) : null} <div className="space-y-3"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">備註</label><input type="text" value={customNote} onChange={e => setCustomNote(e.target.value)} placeholder="備註..." className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-200 outline-none" /></div> <div className="space-y-3"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">數量</label><div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100 w-fit"><button onClick={() => setCount(c => Math.max(1, c - 1))} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border hover:bg-gray-100"><Minus size={20} /></button><span className="text-xl font-bold text-gray-800 w-8 text-center">{count}</span><button onClick={() => setCount(c => c + 1)} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border hover:bg-gray-100"><Plus size={20}/></button></div></div> 
      </div> <div className="pt-2 shrink-0 border-t border-gray-100"><button onClick={confirmAddToCart} disabled={isTimeUp} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex justify-between px-6 ${isTimeUp ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:shadow-orange-500/50 text-white'}`}><span>{isTimeUp ? '已截止' : '加入購物車'}</span><span>${currentItemTotalPrice}</span></button></div> </div> </div> )}
      
      {/* Manual Modal */}
      {isManualOpen && ( <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={() => setIsManualOpen(false)}> <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 pb-8 md:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center border-b border-gray-100 pb-4 shrink-0"> <div><h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><PenSquare size={24}/> 手動輸入</h3><p className="text-gray-400 text-sm mt-1">輸入菜單上找不到的商品</p></div> <button onClick={() => setIsManualOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button> </div> <div className="space-y-5 overflow-y-auto custom-scrollbar px-1 flex-1 py-2"> <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">品項 *</label><input autoFocus type="text" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="商品名稱" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-200 outline-none text-lg font-bold" /></div> <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">單價 *</label><input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="0" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-lg font-bold" /></div> <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">備註</label><input type="text" value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="備註..." className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl" /></div> <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">數量</label><div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100 w-fit"><button onClick={() => setManualCount(c => Math.max(1, c - 1))} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border"><Minus size={20}/></button><span className="text-xl font-bold w-8 text-center">{manualCount}</span><button onClick={() => setManualCount(c => c + 1)} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border"><Plus size={20}/></button></div></div> </div> <div className="pt-2 shrink-0"><button onClick={confirmAddManualItem} className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.01]">加入 - ${(Number(manualPrice) || 0) * manualCount}</button></div> </div> </div> )}
      
      {/* Cart Modal (Mobile) */}
      {isCartOpen && ( <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}> <div className="bg-[#F8F9FA] w-full max-w-md h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}> <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0"> <div><h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShoppingBag className="text-orange-500"/> 購物車</h3></div> <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button> </div> <CartContent /> </div> </div> )}
      
      {/* Room QR Modal */}
      {isQrOpen && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsQrOpen(false)}> <div className="bg-white p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 flex flex-col items-center relative max-w-sm w-full" onClick={e => e.stopPropagation()}> <button onClick={() => setIsQrOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button> <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><QrCode size={24} className="text-orange-500"/> 房間 QR Code</h3> <div className="p-4 bg-white rounded-2xl border-2 border-orange-100 shadow-sm"> <QRCode value={window.location.href} size={200} /> </div> <p className="text-xs font-bold text-orange-600 mt-4 bg-orange-50 px-3 py-1 rounded-full">掃描加入點餐</p> </div> </div> )}
      
      {/* 收款碼 Modal */}
      {isPayModalOpen && paymentQrImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsPayModalOpen(false)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 flex flex-col items-center relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsPayModalOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-2 rounded-full"><QrCode size={24} /></span>
                掃碼付款
            </h3>
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 w-full flex justify-center">
               <img src={paymentQrImage} alt="Payment QR" className="max-w-full max-h-[400px] object-contain rounded-lg" />
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
                請使用支付 App (街口/銀行/TWQR) 掃描上方條碼。<br/>
                轉帳後記得通知主揪喔！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}