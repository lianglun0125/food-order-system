import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Coffee, Utensils, Search, X, QrCode, Clock, 
  ShoppingBag, PenSquare, ChevronRight, Wallet, Loader2, 
  Flame, ScanLine,
  PlusIcon, Crown,
  Minus
} from 'lucide-react';
import QRCode from "react-qr-code";
import { Trash2 } from 'lucide-react'; 

// Hooks
// ★★★ 修正 1: 移除了 type CartItem，因為這個檔案沒用到它 ★★★
import { useCart } from '../hooks/useCart';
import { useRoomData } from '../hooks/useRoomData';

// Components
import ItemDetailModal from '../components/ItemDetailModal';
import ManualEntryModal from '../components/ManualEntryModal';
import NameEntryModal from '../components/NameEntryModal';
import RocketLaunch from '../components/RocketLaunch';
import Toast, { type ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';   

export default function OrderRoom() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [userToken] = useState(() => localStorage.getItem('userToken') || crypto.randomUUID());
  
  useEffect(() => {
    localStorage.setItem('userToken', userToken);
  }, [userToken]);
  
  // 1. 資料邏輯 Hook
  const { 
    roomInfo, categories, globalExtras, existingOrders, 
    loading, error, timeLeft 
  } = useRoomData(id, userName, userToken);

  // 2. 購物車 Hook
  const { cart, addToCart, removeFromCart, updateItemCount, clearCart, totalCartPrice, totalCartCount } = useCart(id);

  // 3. 頁面 UI 狀態
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false); // Mobile Only
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4. Modals 狀態
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentQrImage, setPaymentQrImage] = useState<string | null>(null);
  const [isFetchingQr, setIsFetchingQr] = useState(false);

  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const isHost = localStorage.getItem(`isHost-${id}`) === 'true';
  const isTimeUp = timeLeft?.str === '已截止' || roomInfo?.status === 'LOCKED';

  // 火箭發射訂單
  const [showRocket, setShowRocket] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'failure'>('success');

  // TOAST狀態
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  
  const [copyConfirm, setCopyConfirm] = useState<{ isOpen: boolean; data: string | null }>({
    isOpen: false,
    data: null
  });

  // Helper: 顯示 Toast
  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
  };

  // 初始化 Category Tab
  useMemo(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0].name);
  }, [categories, activeCategory]);

  // 過濾商品邏輯
  const filteredItems = useMemo(() => {
    const items = searchQuery 
        ? categories.flatMap(c => c.items) 
        : (categories.find(c => c.name === activeCategory)?.items || []);
    return searchQuery ? items.filter(i => i.n.includes(searchQuery)) : items;
  }, [activeCategory, categories, searchQuery]);

  // 送出訂單邏輯
  const handleSubmitOrder = async () => {
      if (isTimeUp || cart.length === 0) return;
      
      // 1. 按下按鈕，馬上啟動火箭動畫 (預設為成功狀態)
      setIsSubmitting(true);
      setSubmitStatus('success'); 
      setShowRocket(true);

      try {
          // ★★★ 想看爆炸？把下面這行取消註解，然後去點餐送出看看！ ★★★
          // throw new Error("測試爆炸特效 💥");

          const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
          const payloadItems = cart.flatMap(item => {
              const baseName = item.optionName === '手動輸入' ? item.n : `${item.n} (${item.optionName})`;
              const details = [
                  item.extras?.length ? `[加:${item.extras.map(e => e.n).join(',')}]` : '',
                  item.choice ? `[${item.choice}]` : '',
                  item.sugar, item.ice,
                  item.note ? `(備註:${item.note})` : ''
              ].filter(Boolean).join(' ');
              
              return Array(item.count).fill({ n: `${baseName} ${details}`, p: item.price });
          });

          const res = await fetch(`${apiUrl}/api/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ groupId: roomInfo?.id, userName, items: payloadItems, userToken })
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || '送出失敗');
          }
          
          // 成功流程：
          // 清空購物車 (火箭這時候已經在飛了)
          clearCart();
          setIsCartOpen(false);

      } catch (e) { 
          // 失敗流程：
          console.error('訂單送出錯誤:', e);
          // ★★★ 關鍵：告訴火箭「失敗了」，它就會執行爆炸動畫 ★★★
          setSubmitStatus('failure');
          // 這裡不用 alert，因為火箭會顯示紅色的錯誤訊息
      } finally { 
          setIsSubmitting(false); 
      }
  };

  const handleFetchPaymentQr = async () => {
      if (paymentQrImage) { setIsPayModalOpen(true); return; }
      setIsFetchingQr(true);
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
        const res = await fetch(`${apiUrl}/api/groups/${roomInfo?.id}/payment-qr`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName, userToken })
        });
        const data = await res.json();
        if (data.payment_qr) { setPaymentQrImage(data.payment_qr); setIsPayModalOpen(true); }
        else alert(data.error || '無法取得');
      } catch(e) { alert('讀取失敗'); } finally { setIsFetchingQr(false); }
  };

  const getOrderSummary = (itemsJson: string) => {
    try {
      const items = JSON.parse(itemsJson);
      const counts: Record<string, number> = {};
      items.forEach((item: any) => {
        // 去除詳細備註，只留主名稱，讓顯示簡潔一點
        const name = item.n.split(' (')[0];
        counts[name] = (counts[name] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
        .join(', ');
    } catch { return '內容解析失敗'; }
  };

  // 處理「跟單」(+1) 功能
  const handleCopyOrder = (orderItemsJson: string) => {
    if (isTimeUp) return;
    // 打開確認視窗，並把這筆訂單的 JSON 先存起來
    setCopyConfirm({ isOpen: true, data: orderItemsJson });
  };

  // 執行：使用者在 Modal 按下「確認」後執行
  const onConfirmCopy = () => {
    const orderItemsJson = copyConfirm.data;
    if (!orderItemsJson) return;

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
      // ★★★ 用漂亮的 Toast 取代 alert ★★★
      showToast('已成功加入購物車！ 🛒', 'success');
      
    } catch (e) {
      console.error(e);
      showToast('複製失敗，請重試', 'error');
    } finally {
      // 關閉 Modal
      setCopyConfirm({ isOpen: false, data: null });
    }
  };

  const myBillData = useMemo(() => {
    if (!roomInfo || existingOrders.length === 0) return null;

    // 1. 找出我的所有訂單
    const myOrders = existingOrders.filter(o => o.user_name === userName);
    if (myOrders.length === 0) return null;

    const uniqueUserNames = new Set(existingOrders.map(o => o.user_name));
    const totalUserCount = uniqueUserNames.size;

    const extraFeeTotal = roomInfo.extra_fee || 0;
    const rawFeePerPerson = totalUserCount > 0 ? extraFeeTotal / totalUserCount : 0;
    
    const feePerPerson = Math.ceil(rawFeePerPerson / 5) * 5;

    const rawItems = myOrders.flatMap(o => {
        try { return JSON.parse(o.items_json); } catch { return []; }
    });

    const aggregatedItems = rawItems.reduce((acc: any[], curr: any) => {
        const key = `${curr.n}-${curr.p}`; 
        
        const existing = acc.find(item => item._key === key);
        if (existing) {
            existing.count += 1;
            // existing.subtotal += curr.p; // 不需要手動累加 subtotal，顯示時用 p * count 即可，或這裡算好也可
        } else {
            acc.push({ ...curr, count: 1, _key: key });
        }
        return acc;
    }, []);


    const subtotal = myOrders.reduce((sum, o) => sum + o.total_price, 0);
    const myTotalFee = feePerPerson; 
    const finalTotal = subtotal + myTotalFee;

    return { myItems: aggregatedItems, subtotal, myTotalFee, finalTotal, feePerPerson, orderCount: myOrders.length };
  }, [existingOrders, roomInfo, userName]);

  // --- Render ---

  if (loading) return <div className="min-h-screen flex justify-center items-center text-orange-500 animate-pulse">載入美味菜單中...</div>;
  if (error) return <div className="min-h-screen flex flex-col justify-center items-center text-gray-500"><p>{error}</p></div>;

  // ★★★ 修正 2: 移除了 roomId 屬性，因為 NameEntryModal 不需要它了 ★★★
  if (!userName) return <NameEntryModal roomId={id} onNameSet={setUserName} userToken={userToken} />;

  // Cart UI Component
  const CartUI = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
        {cart.map(item => (
            <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                {/* 上半部：品項名稱與價格 */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-bold text-gray-800 text-base">{item.n}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                           {item.optionName} {item.note && `(${item.note})`}
                        </div>
                    </div>
                    <span className="font-bold text-gray-900">${item.price * item.count}</span>
                </div>
                
                {/* 下半部：數量控制區 */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                     <button 
                       onClick={() => removeFromCart(item.id)} 
                       className="text-xs text-gray-300 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                     >
                        <Trash2 size={14}/> 刪除
                     </button>

                     <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                        <button 
                          onClick={() => updateItemCount(item.id, -1)} 
                          className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        
                        <span className="font-bold text-gray-800 min-w-[1.5rem] text-center">{item.count}</span>
                        
                        <button 
                          onClick={() => updateItemCount(item.id, 1)} 
                          className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 text-green-600 hover:bg-green-50 active:scale-95 transition-all"
                        >
                          <PlusIcon size={14} />
                        </button>
                     </div>
                </div>
            </div>
        ))}
        {cart.length === 0 && <div className="text-center text-gray-400 py-10">購物車是空的 🛒</div>}
      </div>
      <div className="bg-white p-6 border-t border-gray-100">
        <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-bold">總計</span><span className="text-3xl font-black text-gray-900">${totalCartPrice}</span></div>
        
        {/* ★★★ 修改開始：在按鈕中加入數量顯示 ★★★ */}
        <button 
            onClick={handleSubmitOrder} 
            disabled={isSubmitting || cart.length === 0 || isTimeUp} 
            className={`w-full text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isTimeUp || cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black hover:scale-[1.01] active:scale-95'}`}
        >
            {isTimeUp ? '已截止' : isSubmitting ? '傳送中...' : (
                <>
                    <span>確認送出 🚀</span>
                    {totalCartCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full animate-bounce shadow-sm">
                            {totalCartCount}
                        </span>
                    )}
                </>
            )}
        </button>
        {/* ★★★ 修改結束 ★★★ */}
      </div>
    </>
  );
  
  return (
    <div className="min-h-screen bg-[#F3F4F6] lg:flex lg:justify-center">
      <div className="w-full max-w-7xl lg:flex lg:gap-8 lg:p-8">
        
        {/* Main Content */}
        <div className="flex-1 min-w-0 bg-white lg:rounded-3xl lg:shadow-xl lg:overflow-hidden flex flex-col h-screen lg:h-[calc(100vh-4rem)]">
            
            {/* Header: Status & Info */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
                {timeLeft && (
                  <div className={`text-center text-xs font-bold py-1 flex items-center justify-center gap-1 text-white ${timeLeft.str === '已截止' ? 'bg-gray-800' : timeLeft.isUrgent ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>
                     <Clock size={12}/> {timeLeft.str}
                  </div>
                )}
                <div className="px-4 py-3 flex justify-between items-center">
                    <div><div className="text-xs text-gray-400 font-bold">Room Code</div><div className="text-xl font-black text-gray-800">{id}</div></div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => navigate(`/room/${id}/host`)}
                            className={`
                              text-xs rounded-full font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-1
                              ${isHost
                                  ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-white shadow-sm hover:shadow-md hover:scale-105 px-3 pl-2.5 py-1.5'
                                  : 'bg-gray-900 text-white hover:bg-black px-3 py-1.5'
                              }
                            `}
                        >
                            {isHost ? (
                                <>
                                    <Crown size={14} className="text-yellow-100 fill-current" />
                                    <span>主揪後台</span>
                                </>
                            ) : (
                                '查看訂單'
                            )}
                        </button>
                        <button onClick={() => setIsQrOpen(true)} className="bg-gray-100 text-gray-600 p-1.5 rounded-full"><QrCode size={20} /></button>
                        <div className="text-sm font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100">{userName}</div>
                    </div>
                </div>
                {/* Search & Tabs */}
                <div className="px-4 pb-2">
                    {/* 修正：加入一個 relative 的 wrapper，讓 icon 定位更精準 */}
                    <div className="relative w-full">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Search size={18} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="找不到嗎？搜尋你想吃的..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 transition-all" 
                        />
                    </div>
                </div>
                {!searchQuery && (
                  <div className="flex overflow-x-auto px-4 py-2 gap-2 no-scrollbar border-t border-gray-50">
                    {categories.map(cat => (
                        <button key={cat.name} onClick={() => setActiveCategory(cat.name)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold ${activeCategory === cat.name ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border'}`}>{cat.name}</button>
                    ))}
                  </div>
                )}
            </div>

            {/* Content: Payment Card & Products */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {roomInfo?.status === 'LOCKED' && myBillData && (
                <div className="mb-6 bg-white rounded-2xl p-5 border-2 border-orange-100 shadow-lg relative overflow-hidden">
                    {/* 背景裝飾 */}
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-orange-100 rounded-full blur-xl opacity-50 pointer-events-none"></div>
                    
                    <h3 className="font-bold text-gray-800 mb-1 text-lg">
                      👋 嗨，{userName} 結單囉！
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      ✨ 請確認金額並完成付款，感謝你的配合～ ❤️
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {/* 按鈕 A: 查看帳單 */}
                        <button 
                          onClick={() => setIsBillModalOpen(true)}
                          className="bg-orange-50 text-orange-700 border border-orange-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors"
                        >
                           <ShoppingBag size={18} /> 查看帳單明細
                        </button>

                        {/* 按鈕 B: 顯示收款碼 (如果有上傳的話) */}
                        {roomInfo.has_payment_qr ? (
                           <button 
                             onClick={handleFetchPaymentQr} 
                             disabled={isFetchingQr} 
                             className="bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                           >
                                {isFetchingQr ? <Loader2 className="animate-spin" size={18}/> : <Wallet size={18}/>} 
                                網銀轉帳QR CODE
                           </button>
                        ) : (
                           <div className="bg-gray-100 text-gray-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed text-sm">
                              無提供轉帳服務
                           </div>
                        )}
                    </div>
                </div>
            )}
              
              {existingOrders.length > 0 && !searchQuery && (
              <div className="mb-6 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-sm">
                  <Flame size={16} fill="currentColor" /> 大家都在點什麼
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {existingOrders.map((order) => (
                    <div key={order.id} className="min-w-[220px] bg-white p-3 rounded-xl shadow-sm border border-orange-100 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-sm text-gray-800 mb-1">{order.user_name}</div>
                        <div className="text-xs text-gray-500 line-clamp-2 mb-2 min-h-[2.5em]">
                          {getOrderSummary(order.items_json)}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCopyOrder(order.items_json)} 
                        disabled={isTimeUp}
                        className={`w-full text-xs font-bold py-1.5 rounded-lg border whitespace-nowrap transition-colors ${isTimeUp ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200'}`}
                      >
                        +1 跟單 (${order.total_price})
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-24 lg:pb-0">
                    {filteredItems.map((item, idx) => (
                        <div key={idx} onClick={() => setSelectedItem(item)} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start cursor-pointer hover:shadow-md ${isTimeUp && 'opacity-60 grayscale pointer-events-none'}`}>
                            <div className="flex gap-4 items-start">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.is_drink ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>{item.is_drink ? <Coffee size={24} /> : <Utensils size={24} />}</div>
                                <div><h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{item.n}</h3>
                                <p className="text-gray-900 font-bold text-sm">${item.p + item.options[0].price}</p></div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center"><Plus size={18} /></div>
                        </div>
                    ))}
                    {!isTimeUp && ( <button onClick={() => setIsManualOpen(true)} className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 text-gray-400 font-bold flex flex-col items-center justify-center gap-2 hover:border-orange-400 hover:text-orange-500 min-h-[100px]"><PenSquare size={24} /> 手動輸入</button> )}
                </div>
            </div>
        </div>

        {/* Sidebar Cart (Desktop) */}
        <div className="hidden lg:flex w-96 bg-white rounded-3xl shadow-xl flex-col h-[calc(100vh-4rem)] sticky top-8 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="text-orange-500"/> 購物車</h3></div>
            <CartUI />
        </div>
      </div>

      {/* Mobile Cart Button & Modal */}
      {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-6 left-4 right-4 z-30 animate-in slide-in-from-bottom-4">
              <button onClick={() => setIsCartOpen(true)} className="w-full bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center">
                  <div className="flex items-center gap-4"><div className="bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">{totalCartCount}</div><div className="flex flex-col items-start"><span className="text-xs text-gray-400 font-medium">預計</span><span className="font-bold text-xl">${totalCartPrice}</span></div></div>
                  <div className="flex items-center gap-1 font-bold text-orange-400">去結帳 <ChevronRight size={18} /></div>
              </button>
          </div>
      )}
      {isCartOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}>
              <div className="bg-[#F8F9FA] w-full max-w-md h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                  <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShoppingBag className="text-orange-500"/> 購物車</h3>
                      <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button>
                  </div>
                  <CartUI />
              </div>
          </div>
      )}

      {/* Modals */}
      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} globalExtras={globalExtras} userName={userName} isTimeUp={isTimeUp} />
      <ManualEntryModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} onConfirm={addToCart} userName={userName} />
      
      {/* ★★★ 美化後的 QR Code 邀請卡 ★★★ */}
      {isQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setIsQrOpen(false)}>
           {/* 卡片本體：加入極淡的漸層背景提升質感 */}
           <div className="bg-gradient-to-b from-white to-orange-50/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl shadow-orange-100/20 relative flex flex-col items-center animate-in zoom-in-95 slide-in-from-bottom-6 duration-500 border border-white/60" onClick={e => e.stopPropagation()}>
              
              {/* 關閉按鈕 */}
              <button onClick={() => setIsQrOpen(false)} className="absolute top-5 right-5 p-2 bg-black/5 rounded-full hover:bg-black/10 text-gray-400 hover:text-gray-700 transition-colors">
                <X size={18}/>
              </button>

              {/* 標題區塊：移除動畫，改用更穩重的配色 */}
              <div className="text-center mb-8 space-y-2 mt-2">
                 <div className="inline-flex items-center justify-center gap-2 bg-orange-100/80 px-4 py-1.5 rounded-full text-orange-700 font-bold text-sm mb-2">
                    <ScanLine size={16} className="text-orange-500"/>
                    邀請夥伴加入
                 </div>
                 <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                   掃描點餐
                 </h3>
                 <p className="text-gray-500 text-sm">Scan to join the order room</p>
              </div>

              {/* QR Code 主體 */}
              <div className="relative flex items-center justify-center p-5 bg-white rounded-[2rem] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-100 mb-8">
                 <QRCode 
                    value={window.location.href} 
                    size={180} 
                    bgColor="#ffffff"
                    // ★ 修改重點：改用深灰色，比較不突兀且專業
                    fgColor="#374151" /* Tailwind gray-700 */
                    level="H" 
                 />
                 
                 {/* 中心懸浮圖標：保留橘色作為亮點 */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-orange-500 p-3 rounded-full shadow-lg border-4 border-white">
                      <Utensils size={24} className="text-white" />
                    </div>
                 </div>
              </div>

              {/* 底部房間代碼：改用輕盈的虛線框設計 */}
              <div className="w-full py-4 rounded-2xl border-2 border-dashed border-orange-300/50 text-center bg-orange-50/50 backdrop-blur-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-full bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 
                 <p className="text-xs text-orange-600/80 font-bold uppercase tracking-widest mb-1 relative z-10">Room Code</p>
                 <div className="text-4xl font-black text-gray-800 font-mono tracking-[0.2em] ml-[0.2em] relative z-10 drop-shadow-sm">
                    {roomInfo?.join_code}
                 </div>
              </div>
              
           </div>
        </div>
      )}

      {isPayModalOpen && paymentQrImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsPayModalOpen(false)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsPayModalOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">掃QR CODE轉帳</h3>
            <img src={paymentQrImage} alt="Payment QR" className="max-w-full max-h-[400px] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* ★★★ 新增：帳單明細 Modal (發票風格) ★★★ */}
      {isBillModalOpen && myBillData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsBillModalOpen(false)}>
          
          {/* 收據容器 */}
          {/* 修改點 1: 加入 max-h-[85vh] flex flex-col 確保上下留白且內部可滾動 */}
          <div className="bg-white w-full max-w-sm shadow-2xl overflow-hidden relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col" 
               style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 95% 98%, 90% 100%, 85% 98%, 80% 100%, 75% 98%, 70% 100%, 65% 98%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 98%, 30% 100%, 25% 98%, 20% 100%, 15% 98%, 10% 100%, 5% 98%, 0 100%)", borderRadius: "1.5rem 1.5rem 0 0" }}
               onClick={e => e.stopPropagation()}
          >
            
            {/* Header: 固定在上方 */}
            <div className="pt-8 pb-6 px-6 text-center bg-orange-50/50 shrink-0">
               <div className="w-14 h-14 bg-white border border-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-orange-500">
                 <ShoppingBag size={24} />
               </div>
               <h3 className="text-2xl font-black text-gray-900 tracking-tight">消費明細</h3>
               <div className="flex justify-center items-center gap-2 text-xs text-gray-400 font-mono mt-2 uppercase tracking-widest">
                  <span>{new Date().toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{userName}</span>
               </div>
            </div>

            {/* 分隔線 */}
            <div className="relative h-4 bg-white shrink-0">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full border-b-2 border-dashed border-gray-200"></div>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full"></div>
            </div>

            {/* Items List: 滾動區域 */}
            {/* 修改點 2: 改用 flex-1 overflow-y-auto min-h-0 讓它自動伸縮 */}
            <div className="px-8 py-4 space-y-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar bg-white">
              {myBillData.myItems.map((item: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-baseline text-gray-800">
                      <span className="font-bold text-base flex items-center gap-2">
                        {/* 顯示名稱 */}
                        {item.n.split(' (')[0]}                  
                        {item.count > 1 && (
                            <span className="bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold self-center">
                                x{item.count}
                            </span>
                        )}
                      </span>                      
                      <span className="flex-1 mx-2 border-b border-dotted border-gray-300 relative -top-1"></span>            
                      {/* ★ 修改：顯示總價 (單價 * 數量) */}
                      <span className="font-mono font-bold text-lg">${item.p * item.count}</span>
                    </div>                    
                    <div className="text-xs text-gray-400 pl-1 flex justify-between">
                      <span>{item.n.match(/\((.*?)\)/)?.[1] || item.optionName || '單品'}</span>
                      {/* 選填：如果數量 > 1，也可以在這裡顯示單價提示，例如 "$60/份" */}
                      {item.count > 1 && <span>(單價 ${item.p})</span>}
                    </div>
                </div>
              ))}
               
               {myBillData.myTotalFee > 0 && (
                 <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex justify-between items-center text-sm text-orange-800 mt-2">
                    <span className="font-bold flex items-center gap-2"><Wallet size={14}/> 運費分攤</span>
                    <span className="font-mono font-bold text-lg">+${myBillData.myTotalFee}</span>
                 </div>
               )}
            </div>

            {/* Total Section: 固定在下方 */}
            <div className="bg-gray-900 p-8 pb-10 text-white relative overflow-hidden shrink-0">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               
               <div className="relative z-10">
                   <div className="flex justify-between items-end mb-6">
                      <span className="text-gray-400 font-medium text-sm uppercase tracking-widest">Total Amount</span>
                      <span className="text-5xl font-black tracking-tighter font-mono">${myBillData.finalTotal}</span>
                   </div>
                   
                   <div className="h-12 w-full opacity-30 flex justify-between items-end mb-6 select-none grayscale" style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, transparent 5%, white 5%, white 10%, transparent 10%, transparent 15%, white 15%, white 30%, transparent 30%, transparent 35%, white 35%, white 40%, transparent 40%, transparent 55%, white 55%, white 60%, transparent 60%, transparent 65%, white 65%, white 70%, transparent 70%, transparent 80%, white 80%, white 85%, transparent 85%, transparent 90%, white 90%, white 100%)' }}></div>

                   <button onClick={() => setIsBillModalOpen(false)} className="w-full bg-white text-black py-4 rounded-xl font-black text-lg hover:bg-gray-200 transition-colors shadow-lg active:scale-[0.98]">
                      關閉收據
                   </button>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ★★★ 新增：跟單確認視窗 ★★★ */}
      <ConfirmModal 
        isOpen={copyConfirm.isOpen}
        title="要 +1 嗎？"
        content="這將會複製所有餐點內容加入到你目前的購物車中哦"
        onConfirm={onConfirmCopy}
        onCancel={() => setCopyConfirm({ ...copyConfirm, isOpen: false })}
      />

      {/* ★★★ 新增：通用 Toast 通知 ★★★ */}
      {toast && (
        <Toast 
          message={toast.msg} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* ★★★ 新增：火箭發射過場 ★★★ */}
      {showRocket && (
        <RocketLaunch 
            status={submitStatus}
            onComplete={() => setShowRocket(false)} 
        />
      )}

    </div>
  );
}