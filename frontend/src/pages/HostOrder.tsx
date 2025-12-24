import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, Loader2, ImagePlus, Clock, QrCode, XCircle } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

export default function HostOrder() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [timeOption, setTimeOption] = useState<'none' | '11:00' | '14:30' | 'custom'>('none');
  const [customTime, setCustomTime] = useState({ period: 'AM', hour: '11', minute: '00' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { setError('圖片太大囉！請小於 5MB'); return; }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024) { setError('收款碼圖片太大囉！請小於 2MB'); return; }
      setQrFile(selectedFile);
      setQrPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!turnstileToken) { setError('請完成驗證，拜偷拜偷'); return; }
    setIsLoading(true); setError(null);
    try {
      let deadlineTimestamp = null;
      if (timeOption !== 'none') {
        const now = new Date();
        let targetHour = 0; let targetMinute = 0;
        if (timeOption === 'custom') { targetHour = parseInt(customTime.hour); targetMinute = parseInt(customTime.minute); if (customTime.period === 'PM' && targetHour < 12) targetHour += 12; if (customTime.period === 'AM' && targetHour === 12) targetHour = 0; } 
        else { const [h, m] = timeOption.split(':'); targetHour = parseInt(h); targetMinute = parseInt(m); }
        deadlineTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, targetMinute, 0).getTime();
      }
      const formData = new FormData();
      formData.append('image', file);
      if (qrFile) formData.append('paymentQr', qrFile);
      formData.append('cf-turnstile-response', turnstileToken);
      if (deadlineTimestamp) formData.append('deadline', String(deadlineTimestamp));

      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/groups`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setTurnstileToken(''); throw new Error(data.error || '上傳失敗'); }
      localStorage.setItem(`isHost-${data.joinCode}`, 'true');
      navigate(`/room/${data.joinCode}`);
    } catch (err) { setError(err instanceof Error ? err.message : '發生未知錯誤'); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden p-6 space-y-5 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* ★★★ 標題區塊：flex-row (橫排), items-center (垂直置中), justify-center (水平置中) ★★★ */}
        <div className="flex items-center justify-center gap-5 pb-2">
          <div className="shrink-0 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 shadow-sm border border-orange-200">
            <Camera size={32} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">上傳菜單</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">讓 AI 幫你把圖片變成<br/>線上點餐機</p>
          </div>
        </div>

        {/* 圖片上傳區 */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer group border-3 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden ${previewUrl ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/50 bg-gray-50'}`}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          {previewUrl ? (
            <div className="relative w-full h-full p-2">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-xl shadow-sm" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl m-2 backdrop-blur-sm">
                <p className="text-white font-bold flex items-center gap-2"><ImagePlus size={20} /> 更換圖片</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2 p-6 transition-transform group-hover:scale-105 duration-300">
              <div className="bg-white p-3 rounded-full inline-block shadow-md text-gray-400 group-hover:text-orange-500"><Upload size={24} /></div>
              <div><p className="font-bold text-gray-700">點擊上傳菜單</p></div>
            </div>
          )}
        </div>

        {/* 收款碼上傳區 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-orange-200 transition-colors">
            <div 
                onClick={() => qrInputRef.current?.click()}
                className="w-12 h-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 shrink-0 overflow-hidden relative"
            >
                <input type="file" ref={qrInputRef} onChange={handleQrChange} accept="image/*" className="hidden" />
                {qrPreviewUrl ? (<img src={qrPreviewUrl} className="w-full h-full object-cover" />) : (<QrCode size={20} className="text-gray-400" />)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">收款 QR Code <span className="text-gray-400 font-normal text-xs">(選填)</span></p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">上傳街口或銀行轉帳碼，方便收款。</p>
            </div>
            {qrPreviewUrl && (<button onClick={(e) => { e.stopPropagation(); setQrFile(null); setQrPreviewUrl(null); }} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200"><XCircle size={16} className="text-gray-500"/></button>)}
        </div>

        {/* 時間設定 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 ml-1"><Clock size={14} /> 結單時間 (選填)</label>
          <div className="grid grid-cols-4 gap-2">
            {[ { id: 'none', label: '不限時' }, { id: '11:00', label: '11:00' }, { id: '14:30', label: '14:30' }, { id: 'custom', label: '自訂' }, ].map((opt) => (
              <button key={opt.id} onClick={() => setTimeOption(opt.id as any)} className={`py-2 rounded-xl text-xs font-bold transition-all border ${timeOption === opt.id ? 'bg-orange-100 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>{opt.label}</button>
            ))}
          </div>
          {timeOption === 'custom' && (
            <div className="flex gap-2 p-2 bg-gray-50 rounded-xl border border-orange-100 animate-in slide-in-from-top-2">
              <select value={customTime.period} onChange={e => setCustomTime({...customTime, period: e.target.value})} className="flex-1 bg-white rounded-lg p-1.5 text-sm font-bold text-center outline-none border border-gray-200 focus:border-orange-300"><option value="AM">上午</option><option value="PM">下午</option></select>
              <select value={customTime.hour} onChange={e => setCustomTime({...customTime, hour: e.target.value})} className="flex-1 bg-white rounded-lg p-1.5 text-sm font-bold text-center outline-none border border-gray-200 focus:border-orange-300">{Array.from({length: 12}, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}</select>
              <span className="self-center font-bold text-gray-400">:</span>
              <select value={customTime.minute} onChange={e => setCustomTime({...customTime, minute: e.target.value})} className="flex-1 bg-white rounded-lg p-1.5 text-sm font-bold text-center outline-none border border-gray-200 focus:border-orange-300">{['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => <option key={m} value={m}>{m}</option>)}</select>
            </div>
          )}
        </div>

        <div className="flex justify-center min-h-[65px] scale-95 origin-center">
          <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "你的_KEY"} onSuccess={(token) => setTurnstileToken(token)} options={{ theme: 'light', size: 'flexible' }} />
        </div>

        {error && <div className="text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold border border-red-100 text-center animate-pulse">{error}</div>}

        <div className="space-y-2 pt-1">
          <button onClick={handleUpload} disabled={!file || !turnstileToken || isLoading} className="w-full py-3.5 rounded-2xl font-bold text-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200 hover:scale-[1.01] hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
            {isLoading ? <><Loader2 className="inline animate-spin mr-2"/> 分析中...</> : '開始分析'}
          </button>
          <button onClick={() => navigate('/')} className="w-full py-2.5 text-gray-400 font-bold text-sm hover:text-gray-600">取消返回</button>
        </div>
      </div>
    </div>
  );
}