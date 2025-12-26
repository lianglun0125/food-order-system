import { useEffect, useState, useRef } from 'react';
import { Rocket, Sparkles, AlertTriangle, Zap } from 'lucide-react';

type Props = {
  status: 'success' | 'failure';
  onComplete: () => void;
};

export default function RocketLaunch({ status, onComplete }: Props) {
  const [phase, setPhase] = useState<'ignition' | 'launch' | 'success' | 'explode' | 'failure'>('ignition');
  
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>, 
        timer2: ReturnType<typeof setTimeout>, 
        timer3: ReturnType<typeof setTimeout>;

    if (status === 'success') {
      // === 成功劇本 (光速音爆) ===
      // 1. 蓄力震動 1.2秒
      timer1 = setTimeout(() => setPhase('launch'), 1200);
      
      // 2. 音爆瞬間 (速度極快，只要 0.3 秒就切換)
      // 這邊設短一點，讓衝擊波還在擴散時，成功訊息就直接炸出來
      timer2 = setTimeout(() => setPhase('success'), 1500);

      // 3. 結束
      timer3 = setTimeout(() => onCompleteRef.current(), 3500);
    } else {
      // === 失敗劇本 (核爆) ===
      timer1 = setTimeout(() => setPhase('explode'), 1200);
      timer2 = setTimeout(() => setPhase('failure'), 1600);
      timer3 = setTimeout(() => onCompleteRef.current(), 5500);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [status]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/95 backdrop-blur-sm animate-in fade-in duration-300 overflow-hidden">
      
      {/* 背景裝飾 (成功是藍金星空，失敗是紅黑警告) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 opacity-20 animate-pulse ${status==='success'?'text-cyan-200':'text-red-200'}`}><Sparkles size={20} /></div>
        <div className={`absolute top-3/4 right-1/4 opacity-20 animate-pulse delay-700 ${status==='success'?'text-yellow-100':'text-red-200'}`}><Sparkles size={30} /></div>
        
        {/* 成功時的速度線 (Speed Lines) */}
        {status === 'success' && phase === 'launch' && (
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 animate-speed-lines"></div>
        )}
      </div>

      <div className="relative flex flex-col items-center w-full h-full justify-center">
        
        {/* --- 火箭本體 --- */}
        <div className={`
           transition-all ease-in relative z-20
           ${phase === 'ignition' ? 'animate-bounce-fast' : ''}
           
           /* ★★★ 成功：光速拉伸 (Warp) ★★★ */
           /* duration-200: 極速飛出 / scale-y-150: 拉長產生速度感 */
           ${(status === 'success' && (phase === 'launch' || phase === 'success')) 
              ? '-translate-y-[200vh] scale-y-[3] scale-x-75 opacity-50 duration-200 ease-out' 
              : ''}

           /* 失敗：爆炸消失 */
           ${(phase === 'explode' || phase === 'failure') ? 'scale-0 opacity-0 duration-75' : ''}
           
           /* 預設狀態 */
           ${phase === 'ignition' ? 'duration-700' : ''}
        `}>
           <div className="relative">
             {/* 火箭外殼顏色變化 */}
             <div className={`bg-white p-6 rounded-full relative z-10 border-4 transition-colors duration-300
                ${status === 'success' 
                   ? 'shadow-[0_0_80px_rgba(34,211,238,0.8)] border-cyan-100' // 成功：青色光暈
                   : 'shadow-[0_0_50px_rgba(239,68,68,0.6)] border-red-100'} // 失敗：紅色光暈
             `}>
               <Rocket size={64} className={`rotate-45 transition-colors duration-300 
                  ${status === 'success' ? 'text-cyan-600 fill-cyan-50' : 'text-red-600 fill-red-100'}`} 
               />
             </div>
             
             {/* 尾焰 (成功是青色離子推進器，失敗是橘色化學燃料) */}
             <div className={`absolute left-1/2 -translate-x-1/2 top-full -mt-2 flex justify-center transition-all duration-300
                ${phase === 'launch' || phase === 'success' ? 'opacity-100 scale-150' : 'opacity-0 scale-50'}
             `}>
                <div className={`w-4 h-16 rounded-full blur-md animate-pulse 
                    ${status === 'success' ? 'bg-cyan-400 shadow-[0_0_20px_cyan]' : 'bg-orange-500'}`}>
                </div>
             </div>
           </div>
           
           <p className={`text-center mt-8 font-mono font-bold tracking-widest transition-opacity duration-300 ${phase === 'ignition' ? 'opacity-100' : 'opacity-0'} ${status==='success'?'text-cyan-200':'text-red-200'}`}>
             {status === 'success' ? '訂單已裝填至火箭，準備發射' : 'CRITICAL ERROR...'}
           </p>
        </div>

        {/* --- 🌟 成功特效：光速音爆 (Sonic Boom) --- */}
        {status === 'success' && phase === 'launch' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                {/* 1. 垂直光束 (瞬間衝上去的軌跡) */}
                <div className="absolute w-[4px] h-[200vh] bg-white opacity-80 blur-sm animate-warp-beam"></div>
                {/* 2. 藍色音爆圈 */}
                <div className="absolute w-[10px] h-[10px] border-[40px] border-cyan-400 rounded-full animate-sonic-boom opacity-50"></div>
                {/* 3. 畫面閃光 */}
                <div className="absolute inset-0 bg-cyan-100 animate-flash-fast"></div>
            </div>
        )}

        {/* --- 💥 失敗特效：核爆 (Nuclear Explosion) --- */}
        {phase === 'explode' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="w-[10px] h-[10px] bg-white rounded-full animate-explosion-core"></div>
                <div className="absolute w-[10px] h-[10px] border-[50px] border-red-500 rounded-full animate-shockwave opacity-50"></div>
                <div className="absolute inset-0 bg-white animate-flash"></div>
            </div>
        )}

        {/* --- 成功訊息 (從光芒中浮現) --- */}
        {phase === 'success' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            <div className="w-24 h-24 flex-shrink-0 aspect-square bg-cyan-100 rounded-full flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(34,211,238,0.6)]">
              <Zap size={48} className="text-cyan-600 fill-cyan-200" />
            </div>
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight whitespace-nowrap drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">發射成功！</h2>
            <p className="text-cyan-200 whitespace-nowrap font-bold tracking-wide">您的訂單已飛往火星 ⚡</p>
          </div>
        )}

        {/* --- 失敗訊息 --- */}
        {phase === 'failure' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-in zoom-in-95 duration-700">
            <div className="w-24 h-24 flex-shrink-0 aspect-square bg-red-950 border-2 border-red-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-pulse">
              <AlertTriangle size={48} className="text-red-500" />
            </div>
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight whitespace-nowrap">發射失敗 💥</h2>
            <p className="text-red-300 whitespace-nowrap font-bold">引擎過熱，請重試！</p>
          </div>
        )}
        
      </div>

      <style>{`
        @keyframes bounce-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-fast { animation: bounce-fast 0.1s infinite; }

        /* === 失敗特效 (紅) === */
        @keyframes explosion-core {
          0% { transform: scale(1); opacity: 1; background-color: white; }
          40% { transform: scale(40); opacity: 1; background-color: #fb923c; }
          100% { transform: scale(100); opacity: 0; background-color: #ef4444; }
        }
        .animate-explosion-core { animation: explosion-core 0.5s ease-out forwards; }

        @keyframes shockwave {
            0% { transform: scale(1); opacity: 1; border-width: 50px; }
            100% { transform: scale(50); opacity: 0; border-width: 0px; }
        }
        .animate-shockwave { animation: shockwave 0.6s ease-out forwards; }

        /* === 成功特效 (青/藍) === */
        /* 音爆圈：比爆炸更快，顏色更冷 */
        @keyframes sonic-boom {
            0% { transform: scale(0.5); opacity: 1; border-width: 40px; }
            100% { transform: scale(80); opacity: 0; border-width: 0px; }
        }
        .animate-sonic-boom { animation: sonic-boom 0.4s ease-out forwards; }

        /* 光束殘影：瞬間拉長 */
        @keyframes warp-beam {
            0% { transform: translateY(50vh) scaleY(0); opacity: 0; }
            50% { transform: translateY(0) scaleY(1); opacity: 1; }
            100% { transform: translateY(-50vh) scaleY(2); opacity: 0; }
        }
        .animate-warp-beam { animation: warp-beam 0.3s linear forwards; }

        /* 畫面閃光 (通用) */
        @keyframes flash {
            0% { opacity: 0.8; } 100% { opacity: 0; }
        }
        .animate-flash { animation: flash 0.3s ease-out forwards; }

        @keyframes flash-fast {
            0% { opacity: 0.6; } 100% { opacity: 0; }
        }
        .animate-flash-fast { animation: flash 0.15s ease-out forwards; }
      `}</style>
    </div>
  );
}