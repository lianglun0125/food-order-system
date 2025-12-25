import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import HostOrder from './pages/HostOrder';
import JoinOrder from './pages/JoinOrder';
import OrderRoom from './pages/OrderRoom';
import HostDashboard from './pages/HostDashboard';
import NotFound from './pages/NotFound'; // ★ 引入新組件

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostOrder />} />
        <Route path="/join" element={<JoinOrder />} />
        <Route path="/room/:id" element={<OrderRoom />} />
        <Route path="/room/:id/host" element={<HostDashboard />} />
        <Route path="/room" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;