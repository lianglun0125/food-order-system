import { useState } from 'react';
import { X, Minus, Plus, PenSquare } from 'lucide-react';
import type { CartItem } from '../hooks/useCart';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: CartItem) => void;
  userName: string;
};

export default function ManualEntryModal({ isOpen, onClose, onConfirm, userName }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [count, setCount] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim() || !price) return;
    onConfirm({
      id: crypto.randomUUID(),
      n: name,
      price: Number(price),
      count,
      optionName: '手動輸入',
      note,
      owner: userName
    });
    // 重置並關閉
    setName(''); setPrice(''); setNote(''); setCount(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 pb-8 md:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 shrink-0">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><PenSquare size={24}/> 手動輸入</h3>
            <p className="text-gray-400 text-sm mt-1">輸入菜單上找不到的商品</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button>
        </div>

        <div className="space-y-5 overflow-y-auto custom-scrollbar px-1 flex-1 py-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">品項 *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="商品名稱" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-200 outline-none text-lg font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">單價 *</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-lg font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">備註</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="備註..." className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">數量</label>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100 w-fit">
              <button onClick={() => setCount(c => Math.max(1, c - 1))} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border"><Minus size={20}/></button>
              <span className="text-xl font-bold w-8 text-center">{count}</span>
              <button onClick={() => setCount(c => c + 1)} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border"><Plus size={20}/></button>
            </div>
          </div>
        </div>

        <div className="pt-2 shrink-0">
          <button onClick={handleSubmit} className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.01]">
            加入 - ${(Number(price) || 0) * count}
          </button>
        </div>
      </div>
    </div>
  );
}