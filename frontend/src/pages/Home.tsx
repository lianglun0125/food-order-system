import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChefHat, Users, UtensilsCrossed, ArrowRight, Zap, Github, Mail, 
  Sparkles, X, Rocket, ShieldCheck, Smartphone, Gift
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // 模擬更新日誌數據 (加上了顏色主題配置)
  const updates = [
    { 
      ver: 'v1.2.5', date: '2025.12.25', 
      icon: <Rocket size={24} className="text-blue-600"/>, colorBg: 'bg-blue-100', colorText: 'text-blue-700',
      title: 'AI 模型大升級', content: '升級至 Google Gemini 2.5 Flash，提升菜單辨識速度，對手寫字體的解析度更精準。' 
    },
    { 
      ver: 'v1.2.0', date: '2025.12.24', 
      icon: <Smartphone size={24} className="text-purple-600"/>, colorBg: 'bg-purple-100', colorText: 'text-purple-700',
      title: '體驗優化', content: '新增「智慧輪詢」機制，手機背景執行更省電；優化倒數計時顯示。' 
    },
    { 
      ver: 'v1.1.0', date: '2025.12.23', 
      icon: <ShieldCheck size={24} className="text-green-600"/>, colorBg: 'bg-green-100', colorText: 'text-green-700',
      title: '收款安全保護', content: '新增 userToken 驗證機制，現在只有真正點過餐的人才能查看主揪的收款 QR Code。' 
    },
    { 
      ver: 'v1.0.0', date: '2025.12.23', 
      icon: <Gift size={24} className="text-orange-600"/>, colorBg: 'bg-orange-100', colorText: 'text-orange-700',
      title: '正式上線', content: '辦公室點餐小助手誕生！支援照片辨識菜單、多人協作點餐。' 
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#F3F4F6]">
      {/* 自定義滾動條樣式 (給彈窗用) */}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d1d5db; }`}</style>

      {/* 背景裝飾 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 animate-pulse pointer-events-none"></div>

      {/* 主要內容區 */}
      <div className="flex-1 flex flex-col justify-center items-center w-full p-6 z-10">
        <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-12">
          
          {/* 左側：標題區 */}
          <div className="flex-1 text-center md:text-left space-y-6">
            
            {/* 可點擊的更新按鈕 */}
            <button 
              onClick={() => setIsChangelogOpen(true)}
              className="group inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-orange-600 border border-orange-100 mb-2 hover:bg-orange-50 hover:shadow-md hover:scale-105 transition-all cursor-pointer animate-[bounce_3s_infinite]"
            >
              <Zap size={16} className="fill-orange-600 group-hover:rotate-12 transition-transform" />
              <span>就是點餐小助手ㄇㄟ～</span>
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full ml-1 border border-orange-200">v1.2.5</span>
            </button>

            <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight">
              辦公室點餐<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">就這麼簡單ㄇㄟ</span>
            </h1>
          </div>

          {/* 右側：功能卡片區 */}
          <div className="flex-1 w-full max-w-sm grid gap-4">
            <button onClick={() => navigate('/host')} className="group relative flex items-center p-6 bg-white border-2 border-orange-100 rounded-3xl shadow-xl hover:shadow-2xl hover:border-orange-500 transition-all duration-300 text-left active:scale-[0.98]">
              <div className="mr-5 p-4 bg-orange-100 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors"><ChefHat size={32} strokeWidth={2.5} /></div>
              <div className="flex-1"><h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">我是主揪</h3><p className="text-sm text-gray-400 mt-1">上傳菜單照片，<br/>一鍵開啟揪團房間</p></div>
              <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"><ArrowRight className="text-orange-500" /></div>
            </button>

            <button onClick={() => navigate('/join')} className="group relative flex items-center p-6 bg-white border-2 border-blue-50 rounded-3xl shadow-lg hover:shadow-xl hover:border-blue-500 transition-all duration-300 text-left active:scale-[0.98]">
              <div className="mr-5 p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Users size={32} strokeWidth={2.5} /></div>
              <div className="flex-1"><h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">加入預訂</h3><p className="text-sm text-gray-400 mt-1">輸入 4 位數代碼，<br/>加入同事的點餐團</p></div>
              <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"><ArrowRight className="text-blue-500" /></div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="w-full py-6 flex flex-col items-center gap-3 text-xs text-gray-400 font-medium px-4 text-center z-20 backdrop-blur-sm">
        <a href="https://github.com/lianglun0125/food-order-system" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gray-700 hover:underline transition-colors">
          <Github size={14} /> This project is open source on GitHub.
        </a>
        <a href="mailto:me@chelunliang.com" className="flex flex-wrap items-center justify-center gap-1.5 hover:text-gray-700 hover:underline transition-colors max-w-full px-4 leading-relaxed">
          <Mail size={14} className="shrink-0" /> <span>Contact me at</span> <span className="block md:inline font-bold text-gray-500">me@chelunliang.com</span>
        </a>
        <div className="flex flex-wrap justify-center items-center gap-1.5 mt-1 opacity-75"><UtensilsCrossed size={12} /> Powered by Cloudflare Workers & Gemini & Che-Lun Liang.</div>
      </div>

      {/* ★★★ 新增：美化版的更新日誌 Modal ★★★ */}
      {isChangelogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsChangelogOpen(false)}>
          {/* Modal Container - 毛玻璃卡片風格 */}
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-[480px] rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative" onClick={e => e.stopPropagation()}>
            
            {/* 裝飾背景圖標 */}
            <Sparkles className="absolute top-4 right-16 text-orange-200 opacity-30 -rotate-12 pointer-events-none" size={80} />

            {/* Header */}
            <div className="p-8 pb-4 relative z-10">
              <div className="flex items-center gap-2 text-orange-600 font-bold text-sm mb-2 uppercase tracking-wider">
                 <Gift size={16} /> What's New
              </div>
              <h2 className="text-3xl font-black text-gray-900">更新日誌</h2>
            </div>

            {/* Close Button - 懸浮圓形按鈕 */}
            <button onClick={() => setIsChangelogOpen(false)} className="absolute top-6 right-6 p-3 bg-gray-100/80 hover:bg-gray-200/80 backdrop-blur-md rounded-full transition-all shadow-sm hover:rotate-90 z-20">
               <X size={20} className="text-gray-600"/>
            </button>

            {/* Content - 卡片式列表 */}
            <div className="p-6 pt-2 max-h-[60vh] overflow-y-auto custom-scrollbar relative z-10 space-y-4">
              {updates.map((update, idx) => (
                <div key={idx} className="group bg-white/80 hover:bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex gap-4 items-start">
                  {/* 左側圖標 */}
                  <div className={`shrink-0 w-12 h-12 ${update.colorBg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    {update.icon}
                  </div>
                  {/* 右側內容 */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                         {update.title}
                      </h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${update.colorBg} ${update.colorText}`}>
                        {update.ver}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium mb-2">{update.date}</p>
                    <p className="text-sm text-gray-600 leading-relaxed text-justify">
                      {update.content}
                    </p>
                  </div>
                </div>
              ))}
              <div className="text-center text-xs text-gray-400 pt-4 pb-2">
                我獨自升級……持續進化中……
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}