import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HostOrder from './pages/HostOrder';
import JoinOrder from './pages/JoinOrder';
import OrderRoom from './pages/OrderRoom';
import HostDashboard from './pages/HostDashboard';

function App() {
  return (
    <BrowserRouter>
      {/* 背景色改淡一點的灰，讓卡片更明顯 */}
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        {/* 關鍵修改：
           1. 移除 max-w-md mx-auto (這會鎖死寬度)
           2. 改用 w-full，但個別頁面自己控制內容寬度
           3. 我們在這邊設一個基礎容器，但在 OrderRoom 裡我們會覆蓋它
        */}
        <div className="min-h-screen relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/host" element={<HostOrder />} />
            <Route path="/join" element={<JoinOrder />} />
            <Route path="/room/:id" element={<OrderRoom />} />
            <Route path="/room/:id/host" element={<HostDashboard />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;