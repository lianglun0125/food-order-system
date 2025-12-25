// src/components/ItemDetailModal.tsx
import { useState, useEffect } from 'react';
import { X, Minus, Plus, CheckCircle2, Flame } from 'lucide-react';
import type { MenuItem, ItemOption, ExtraOption } from '../types';
import type { CartItem } from '../hooks/useCart';

type Props = {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void; // 回傳組裝好的 Item
  globalExtras: ExtraOption[];
  userName: string;
  isTimeUp: boolean;
};

const SUGAR_LEVELS = ['正常糖', '少糖', '半糖', '微糖', '無糖'];
const ICE_LEVELS = ['正常冰', '少冰', '微冰', '去冰', '溫', '熱'];

export default function ItemDetailModal({ item, onClose, onAddToCart, globalExtras, userName, isTimeUp }: Props) {
  // 狀態管理只存在於 Modal 內部
  const [count, setCount] = useState(1);
  const [customOption, setCustomOption] = useState<ItemOption | null>(null);
  const [customChoice, setCustomChoice] = useState<string>('');
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [customSugar, setCustomSugar] = useState('正常糖');
  const [customIce, setCustomIce] = useState('正常冰');
  const [customNote, setCustomNote] = useState('');

  // 當 item 改變時重置狀態
  useEffect(() => {
    if (item) {
      setCount(1);
      setCustomOption(item.options[0] || null);
      setCustomChoice(item.choices?.[0] || '');
      setSelectedExtras([]);
      setCustomSugar('正常糖');
      setCustomIce('正常冰');
      setCustomNote('');
    }
  }, [item]);

  if (!item || !customOption) return null;
  const unitPrice = item.p + customOption.price + selectedExtras.reduce((s, e) => s + e.p, 0);
  const currentPrice = unitPrice * count;

  const handleConfirm = () => {
    const unitPrice = item.p + customOption.price + selectedExtras.reduce((s, e) => s + e.p, 0);
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      n: item.n,
      price: unitPrice,
      count,
      optionName: customOption.name,
      choice: customChoice,
      extras: selectedExtras,
      sugar: item.is_drink ? customSugar : undefined,
      ice: item.is_drink ? customIce : undefined,
      note: customNote,
      owner: userName
    };
    onAddToCart(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 pb-8 md:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4 shrink-0">
          <div><h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{item.n} {item.spicy && <Flame size={20} className="text-red-500" fill="currentColor"/>}</h3></div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-6 overflow-y-auto custom-scrollbar px-1 flex-1 py-2">
          
          {/* 規格選擇 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">規格</label>
            <div className="flex flex-wrap gap-2">
              {item.options.map(opt => (
                <button key={opt.name} onClick={() => setCustomOption(opt)} className={`px-4 py-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${customOption.name === opt.name ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500' : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.name === '單一規格' ? '一份' : opt.name} 
                  {opt.price > 0 && (
                    <span className="bg-white/50 px-1.5 rounded text-xs opacity-70 border border-black/5 text-orange-600 font-bold">+${opt.price}</span>
                  )}
                  </button>
              ))}
            </div>
          </div>
          
          {/* ★★★ 新增：選項選擇 (麵體/口味) ★★★ */}
          {item.choices && item.choices.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">選項</label>
              <div className="flex flex-wrap gap-2">
                {item.choices.map(choice => (
                  <button 
                    key={choice} 
                    onClick={() => setCustomChoice(choice)} 
                    className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                      customChoice === choice 
                        ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500' 
                        : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}    

          {/* 加料區 (僅飲料顯示) */}
          {item.is_drink && globalExtras.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">✨ 加點配料</label>
              <div className="grid grid-cols-2 gap-2">
                {globalExtras.map(extra => (
                  <button key={extra.n} onClick={() => setSelectedExtras(prev => prev.find(e => e.n === extra.n) ? prev.filter(e => e.n !== extra.n) : [...prev, extra])} 
                    className={`px-4 py-3 rounded-xl border text-sm font-bold flex justify-between items-center ${selectedExtras.some(e=>e.n===extra.n) ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1' : 'border-gray-100 text-gray-600'}`}>
                    <span className="flex items-center gap-2">{selectedExtras.some(e=>e.n===extra.n) && <CheckCircle2 size={14} />}{extra.n}</span>
                    <span className="text-xs text-gray-400">+${extra.p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 甜度冰塊 (僅飲料顯示) */}
          {item.is_drink && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">甜度</label>
                <div className="flex flex-wrap gap-2">{SUGAR_LEVELS.map(l => <button key={l} onClick={() => setCustomSugar(l)} className={`px-3 py-2 rounded-lg text-sm border ${customSugar === l ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-gray-100 bg-white text-gray-600'}`}>{l}</button>)}</div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">冰塊</label>
                <div className="flex flex-wrap gap-2">{ICE_LEVELS.map(l => <button key={l} onClick={() => setCustomIce(l)} className={`px-3 py-2 rounded-lg text-sm border ${customIce === l ? 'border-cyan-500 bg-cyan-50 text-cyan-700 font-bold' : 'border-gray-100 bg-white text-gray-600'}`}>{l}</button>)}</div>
              </div>
            </div>
          )}

          {/* 數量 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">數量</label>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100 w-fit">
              <button onClick={() => setCount(c => Math.max(1, c - 1))} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border hover:bg-gray-100"><Minus size={20} /></button>
              <span className="text-xl font-bold text-gray-800 w-8 text-center">{count}</span>
              <button onClick={() => setCount(c => c + 1)} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border hover:bg-gray-100"><Plus size={20}/></button>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="pt-2 shrink-0 border-t border-gray-100">
          <button onClick={handleConfirm} disabled={isTimeUp} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex justify-between px-6 ${isTimeUp ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:shadow-orange-500/50 text-white'}`}>
            <span>{isTimeUp ? '已截止' : '加入購物車'}</span>
            <span>${currentPrice}</span>
          </button>
        </div>

      </div>
    </div>
  );
}