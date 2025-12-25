import { useNavigate } from 'react-router-dom';
import { Home, Utensils, Ghost, MoveLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* 背景裝飾圓圈 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 translate-y-1/2 animate-pulse pointer-events-none"></div>

      <div className="max-w-md w-full text-center space-y-8 z-10">
        
        {/* 插圖區：空碗與幽靈 */}
        <div className="relative inline-block">
          <div className="w-48 h-48 bg-white rounded-full shadow-2xl flex items-center justify-center relative z-10 border-8 border-orange-50">
            <Utensils size={80} className="text-gray-200" />
            {/* 漂浮的小幽靈 */}
            <div className="absolute -top-4 -right-2 animate-bounce">
              <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg">
                <Ghost size={24} />
              </div>
            </div>
          </div>
          {/* 碗底部的裝飾 */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-gray-200/50 rounded-full blur-sm"></div>
        </div>

        {/* 文字區 */}
        <div className="space-y-3">
          <h1 className="text-7xl font-black text-gray-900 tracking-tighter">404</h1>
          <h2 className="text-2xl font-bold text-gray-800">哇勒！碗空空的ㄋㄟ⋯⋯</h2>
          <p className="text-gray-500 leading-relaxed">
            找不到這個房間或頁面，可能代碼打錯了，<br />
            或者是主揪已經把房間吃掉（刪除）囉！
          </p>
        </div>

        {/* 按鈕區 */}
        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={() => navigate('/')}
            className="group flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Home size={20} />
            回到首頁
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-3 text-gray-500 font-bold hover:text-gray-800 transition-colors"
          >
            <MoveLeft size={18} />
            返回上一頁
          </button>
        </div>
      </div>

      {/* 底部小裝飾 */}
      <div className="mt-12 text-gray-300 flex items-center gap-2 font-medium italic">
        <span>Food-Ordering System</span>
        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
        <span>Not Found</span>
      </div>
    </div>
  );
}