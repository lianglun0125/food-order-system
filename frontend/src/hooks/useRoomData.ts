import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartPolling } from './useSmartPolling';
import type { Category, ExtraOption, RoomInfo, Order } from '../types';

export function useRoomData(roomId: string | undefined, userName: string, userToken: string) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 資料狀態
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalExtras, setGlobalExtras] = useState<ExtraOption[]>([]);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  
  // 倒數計時狀態
  const [timeLeft, setTimeLeft] = useState<{ str: string, isUrgent: boolean } | null>(null);

  // 核心資料獲取函式
  const fetchData = useCallback(async () => {
    if (!roomId) return;
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
      
      // 1. 抓房間資訊
      const roomRes = await fetch(`${apiUrl}/api/groups/${roomId}`);
      if (roomRes.status === 404) {
        navigate('/404', { replace: true });
        return;
      }
      if (!roomRes.ok) throw new Error('無法讀取房間資料');
      
      const roomData: RoomInfo = await roomRes.json();
      setRoomInfo(roomData);

      // 2. 解析菜單 (只在第一次載入時執行，避免畫面閃爍)
      if (categories.length === 0) {
        if (roomData.menu.global_extras) setGlobalExtras(roomData.menu.global_extras);
        
        let parsedCategories: Category[] = roomData.menu.categories || [{ name: '全部品項', items: roomData.menu.items || [] }];
        
        // 正規化 options
        parsedCategories.forEach(cat => {
          cat.items = cat.items.map((item) => {
            let options = item.options || [];

            // 邏輯修正：
            // 如果商品有底價 (如牛肉麵 $110)，且有選項 (如加大 $10)
            // 代表這些選項是「加價購」，我們需要補一個「正常」的選項
            if (item.p > 0 && options.length > 0) {
                // 檢查是否已經有 0 元的選項，沒有的話就補一個 "正常"
                if (!options.some(opt => opt.price === 0)) {
                    options = [{ name: '正常', price: 0 }, ...options];
                }
            }

            // 如果完全沒選項，就給一個預設的
            if (options.length === 0) {
                options = [{ name: '單一規格', price: 0 }]; // 注意這裡改成 0
            }

            return { ...item, options };
          });
        });
        setCategories(parsedCategories);
      }

      // 3. 抓訂單
      if (roomData.id) {
        const oRes = await fetch(`${apiUrl}/api/groups/${roomData.id}/orders`);
        if (oRes.ok) {
          const ordersData = await oRes.json();
          setExistingOrders(ordersData.orders || []);
        }
      }
    } catch (e) {
      console.error(e);
      // 只有在第一次載入失敗時才顯示全域錯誤，避免輪詢時輕微網路波動造成干擾
      if (loading) setError('讀取失敗或房間已關閉');
    } finally {
      setLoading(false);
    }
  }, [roomId, navigate, categories.length, loading]);

  // 啟用智慧輪詢 (每 4 秒)
  useSmartPolling(fetchData, 4000, true);

  // 心跳機制 (維持在線)
  useSmartPolling(async () => {
    if (userName && roomId && roomInfo?.status !== 'LOCKED') {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
        // 這裡需要注意：原本你的 id 是 joinCode 還是 UUID？假設 param 是 joinCode，需轉換成 UUID
        if (roomInfo?.id) {
             await fetch(`${apiUrl}/api/groups/${roomInfo.joinCode}/join`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ userName, userToken }) 
            });
        }
      } catch (e) { console.error('心跳失敗', e); }
    }
  }, 10000, !!userName && !!roomInfo);

  // 倒數計時邏輯 (純前端計算)
  useMemo(() => {
    // ★★★ 修正點：如果狀態是 LOCKED，顯示「已截止」，而不是隱藏 ★★★
    if (roomInfo?.status === 'LOCKED') {
      setTimeLeft({ str: '已截止', isUrgent: false });
      return;
    }

    // 如果沒有截止時間，就隱藏
    if (!roomInfo?.deadline) {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = roomInfo.deadline! - now;
      
      if (diff <= 0) {
        setTimeLeft({ str: '已截止', isUrgent: false });
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ 
            str: `剩餘 ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, 
            isUrgent: diff < 5 * 60 * 1000 
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [roomInfo?.deadline, roomInfo?.status]);

  return {
    loading,
    error,
    roomInfo,
    categories,
    globalExtras,
    existingOrders,
    timeLeft,
    fetchData // 導出以便手動刷新
  };
}