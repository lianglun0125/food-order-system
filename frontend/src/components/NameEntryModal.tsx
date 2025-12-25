import { useState } from 'react';
import { UserCheck, AlertTriangle, Loader2 } from 'lucide-react';

type Props = {
  roomId: string | undefined;
  onNameSet: (name: string) => void;
  userToken: string; // ★ 修正 1: 定義這個 Prop
};

// ★ 修正 2: 在參數中解構出 userToken
export default function NameEntryModal({ roomId, onNameSet, userToken }: Props) {
  const [inputName, setInputName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleStart = async () => {
    const name = inputName.trim();
    if (!name) return;
    
    setIsChecking(true);
    setError(null);

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      
      const res = await fetch(`${apiUrl}/api/groups/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 因為上面參數有 userToken 了，這裡的 shorthand寫法才會生效
        body: JSON.stringify({ userName: name, userToken }) 
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          throw new Error(data.error || '暱稱重複');
        }
        if (res.status === 404) {
             throw new Error('房間不存在或代碼錯誤');
        }
        throw new Error('無法加入，請稍後再試');
      }

      localStorage.setItem('userName', name);
      onNameSet(name);

    } catch (e) {
      setError(e instanceof Error ? e.message : '發生錯誤');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCheck size={40} className="text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">歡迎點餐</h2>
          <p className="text-gray-500 text-sm mt-1">請輸入你的暱稱，方便主揪分餐</p>
        </div>
        <div className="relative">
          <input
            autoFocus
            type="text"
            value={inputName}
            onChange={(e) => { setInputName(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="輸入你的暱稱"
            className={`w-full text-center text-xl font-bold py-3 border-b-2 bg-transparent focus:outline-none transition-colors ${error ? 'border-red-500 text-red-600' : 'border-orange-100 focus:border-orange-500'}`}
          />
          {error && (
            <div className="text-red-500 text-xs mt-2 flex items-center justify-center gap-1 font-bold animate-pulse">
              <AlertTriangle size={12} /> {error}
            </div>
          )}
        </div>
        <button
          onClick={handleStart}
          disabled={!inputName.trim() || isChecking}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isChecking ? <><Loader2 className="animate-spin" size={20}/> 檢查中...</> : '開始點餐'}
        </button>
      </div>
    </div>
  );
}