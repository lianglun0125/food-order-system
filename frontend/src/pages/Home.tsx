import { useNavigate } from 'react-router-dom';
import { ChefHat, Users, UtensilsCrossed, ArrowRight, Zap, Github, Mail } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      
      {/* 背景裝飾 (圓形光暈) - 保持 absolute */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 animate-pulse pointer-events-none"></div>

      {/* ★★★ 主要內容區：加上 flex-1 讓它佔據剩餘高度，並負責垂直置中 ★★★ */}
      <div className="flex-1 flex flex-col justify-center items-center w-full p-6 z-10">
        <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-12">
          
          {/* 左側：標題區 */}
          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-orange-600 border border-orange-100 mb-2">
              <Zap size={16} className="fill-orange-600" />
              就是點餐小助手ㄇㄟ～
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight">
              辦公室點餐<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">就這麼簡單ㄇㄟ</span>
            </h1>
          </div>

          {/* 右側：功能卡片區 */}
          <div className="flex-1 w-full max-w-sm grid gap-4">
            
            {/* 按鈕 1: 我是主揪 */}
            <button
              onClick={() => navigate('/host')}
              className="group relative flex items-center p-6 bg-white border-2 border-orange-100 rounded-3xl shadow-xl hover:shadow-2xl hover:border-orange-500 transition-all duration-300 text-left active:scale-[0.98]"
            >
              <div className="mr-5 p-4 bg-orange-100 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <ChefHat size={32} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">我是主揪</h3>
                <p className="text-sm text-gray-400 mt-1">上傳菜單照片，<br/>一鍵開啟揪團房間</p>
              </div>
              <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="text-orange-500" />
              </div>
            </button>

            {/* 按鈕 2: 加入預訂 */}
            <button
              onClick={() => navigate('/join')}
              className="group relative flex items-center p-6 bg-white border-2 border-blue-50 rounded-3xl shadow-lg hover:shadow-xl hover:border-blue-500 transition-all duration-300 text-left active:scale-[0.98]"
            >
              <div className="mr-5 p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Users size={32} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">加入預訂</h3>
                <p className="text-sm text-gray-400 mt-1">輸入 4 位數代碼，<br/>加入同事的點餐團</p>
              </div>
              <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="text-blue-500" />
              </div>
            </button>

          </div>
        </div>
      </div>
      
      {/* ★★★ Footer 區域：拿掉 absolute，讓它自然流動在最下方 ★★★ */}
      <div className="w-full py-6 flex flex-col items-center gap-3 text-xs text-gray-400 font-medium px-4 text-center z-20 backdrop-blur-sm">
        
        {/* GitHub Link */}
        <a 
          href="https://github.com/lianglun0125/food-order-system" // 記得換喔
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-gray-700 hover:underline transition-colors"
        >
          <Github size={14} />
          This project is open source on GitHub.
        </a>

        {/* Contact Info - 加上 flex-wrap 和 justify-center 防止跑版 */}
        <a 
          href="mailto:me@chelunliang.com"
          className="flex flex-wrap items-center justify-center gap-1.5 hover:text-gray-700 hover:underline transition-colors max-w-full px-4 leading-relaxed"
        >
          <Mail size={14} className="shrink-0" /> {/* shrink-0 防止 icon 被擠壓 */}
          <span>Contact me at</span>
          {/* 在手機版強制換行顯示 Email，比較好看 */}
          <span className="block md:inline font-bold text-gray-500">me@chelunliang.com</span>
        </a>

        {/* Powered By */}
        <div className="flex flex-wrap justify-center items-center gap-1.5 mt-1 opacity-75">
          <UtensilsCrossed size={12} /> 
          Powered by Cloudflare Workers & Gemini & Che-Lun Liang.
        </div>
      </div>
    </div>
  );
}