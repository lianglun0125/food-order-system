import { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingCart, MessageSquare, Snowflake, Droplets } from 'lucide-react'; // 新增 icon

type ItemDetailModalProps = {
  item: any;
  onClose: () => void;
  onAddToCart: (item: any) => void;
  globalExtras?: any[];
  userName: string;
  isTimeUp: boolean;
};

export default function ItemDetailModal({ 
  item, 
  onClose, 
  onAddToCart, 
  globalExtras = [], 
  userName, 
  isTimeUp 
}: ItemDetailModalProps) {
  
  if (!item) return null;

  // --- States ---
  const [count, setCount] = useState(1);
  const [note, setNote] = useState(''); 
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  
  // ★★★ 新增：甜度冰塊狀態 ★★★
  const [selectedSugar, setSelectedSugar] = useState<string>('');
  const [selectedIce, setSelectedIce] = useState<string>('');

  useEffect(() => {
    if (item) {
      setCount(1);
      setNote('');
      setSelectedExtras([]);
      
      // 初始化規格 (Size)
      if (item.options && item.options.length > 0) {
        setSelectedOption(item.options[0]);
      } else {
        setSelectedOption({ name: '正常', price: 0 });
      }

      // ★★★ 初始化甜度冰塊 ★★★
      // 如果有回傳 sugar_opts，預設選第一個 (通常是全糖/正常)
      if (item.sugar_opts && item.sugar_opts.length > 0) {
        setSelectedSugar(item.sugar_opts[0]);
      }
      if (item.ice_opts && item.ice_opts.length > 0) {
        setSelectedIce(item.ice_opts[0]);
      }
    }
  }, [item]);

  // --- 計算價格 ---
  const basePrice = item.p || 0;
  const optionPrice = selectedOption?.price || 0;
  const extrasPrice = selectedExtras.reduce((sum, e) => sum + e.p, 0);
  const unitPrice = basePrice + optionPrice + extrasPrice;
  const totalPrice = unitPrice * count;

  // --- 處理加料 ---
  const toggleExtra = (extra: any) => {
    setSelectedExtras(prev => {
      const exists = prev.find(e => e.n === extra.n);
      return exists ? prev.filter(e => e.n !== extra.n) : [...prev, extra];
    });
  };

  // --- 送出 ---
  const handleConfirm = () => {
    onAddToCart({
      id: crypto.randomUUID(),
      n: item.n,
      price: unitPrice,
      count: count,
      optionName: selectedOption.name,
      extras: selectedExtras,
      // ★★★ 寫入甜度冰塊到購物車 ★★★
      sugar: selectedSugar,
      ice: selectedIce,
      note: note.trim(),
      owner: userName
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative h-40 bg-orange-50 shrink-0 flex items-center justify-center overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-100 to-white opacity-50"></div>
             <h2 className="text-3xl font-black text-orange-900/10 relative z-10 scale-150 transform rotate-[-5deg]">{item.is_drink ? 'DRINK' : 'DELICIOUS'}</h2>
             <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-800 transition-colors z-20"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-1">{item.n}</h3>
              <p className="text-orange-600 font-bold text-xl">${basePrice}</p>
            </div>

            {/* 1. 規格 (Size) */}
            {item.options && item.options.length > 1 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">規格選擇</label>
                <div className="flex flex-wrap gap-2">
                  {item.options.map((opt: any, idx: number) => (
                    <button key={idx} onClick={() => setSelectedOption(opt)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedOption?.name === opt.name ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {opt.name} {opt.price > 0 && `(+$${opt.price})`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ★★★ 2. 甜度選擇 (只在有資料時顯示) ★★★ */}
            {item.sugar_opts && item.sugar_opts.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Droplets size={12}/> 甜度</label>
                <div className="flex flex-wrap gap-2">
                  {item.sugar_opts.map((opt: string, idx: number) => (
                    <button key={idx} onClick={() => setSelectedSugar(opt)} className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${selectedSugar === opt ? 'bg-pink-100 text-pink-700 border-pink-200 ring-2 ring-pink-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ★★★ 3. 冰塊選擇 (只在有資料時顯示) ★★★ */}
            {item.ice_opts && item.ice_opts.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Snowflake size={12}/> 冰塊</label>
                <div className="flex flex-wrap gap-2">
                  {item.ice_opts.map((opt: string, idx: number) => (
                    <button key={idx} onClick={() => setSelectedIce(opt)} className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${selectedIce === opt ? 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. 加料區 */}
            {globalExtras && globalExtras.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">加料 / 加購</label>
                <div className="grid grid-cols-2 gap-2">
                   {globalExtras.map((extra, idx) => {
                     const isSelected = selectedExtras.some(e => e.n === extra.n);
                     return (
                       <button key={idx} onClick={() => toggleExtra(extra)} className={`flex justify-between items-center px-3 py-2.5 rounded-xl text-sm border transition-all ${isSelected ? 'bg-orange-50 border-orange-200 text-orange-700 font-bold' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}>
                         <span>{extra.n}</span><span className="text-xs opacity-70">+${extra.p}</span>
                       </button>
                     )
                   })}
                </div>
              </div>
            )}

            {/* 5. 備註 */}
            <div className="space-y-3">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><MessageSquare size={12}/> 備註</label>
               <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：不要蔥、分裝..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all font-medium text-gray-700 placeholder:text-gray-400"/>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white shrink-0">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                  <button onClick={() => setCount(Math.max(1, count - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-black disabled:opacity-50 transition-all active:scale-90" disabled={count <= 1}><Minus size={16} /></button>
                  <span className="font-black text-lg min-w-[1.5rem] text-center">{count}</span>
                  <button onClick={() => setCount(count + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-black transition-all active:scale-90"><Plus size={16} /></button>
              </div>
              <button onClick={handleConfirm} disabled={isTimeUp} className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isTimeUp ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`}>
                 <ShoppingCart size={18} /><span>加入 - ${totalPrice}</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}