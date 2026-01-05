import { useState, useEffect, useCallback } from 'react';

// 定義 CartItem 型別
export type CartItem = {
  id: string; 
  n: string; 
  price: number; 
  count: number; 
  optionName: string; 
  choice?: string; 
  extras?: any[]; 
  sugar?: string; 
  ice?: string; 
  note?: string; 
  owner: string;
};

export function useCart(roomId: string | undefined) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (!roomId) return [];
    try { 
      const saved = localStorage.getItem(`cart-${roomId}`); 
      return saved ? JSON.parse(saved) : []; 
    } catch { return []; }
  });

  // 自動儲存到 LocalStorage
  useEffect(() => {
    if (roomId) {
      localStorage.setItem(`cart-${roomId}`, JSON.stringify(cart));
    }
  }, [cart, roomId]);

  // 加入購物車 (含合併邏輯)
  const addToCart = useCallback((newItem: CartItem) => {
    setCart(prev => {
      // 比對內容是否完全一致
      const existingIndex = prev.findIndex(item => {
        return (
          item.n === newItem.n &&
          item.price === newItem.price &&
          item.optionName === newItem.optionName &&
          item.choice === newItem.choice &&
          item.sugar === newItem.sugar &&
          item.ice === newItem.ice &&
          item.note === newItem.note &&
          JSON.stringify(item.extras || []) === JSON.stringify(newItem.extras || [])
        );
      });

      if (existingIndex !== -1) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          count: newCart[existingIndex].count + newItem.count
        };
        return newCart;
      }

      return [...prev, newItem];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  }, []);

  // ★★★ 新增：更新數量 (支援 +1 / -1) ★★★
  const updateItemCount = useCallback((itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, count: item.count + delta };
      }
      return item;
    })
    // 過濾掉數量 <= 0 的項目 (即自動刪除)
    .filter(item => item.count > 0));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    if (roomId) localStorage.removeItem(`cart-${roomId}`);
  }, [roomId]);

  const totalCartPrice = cart.reduce((sum, item) => sum + (item.price * item.count), 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.count, 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateItemCount, // ★ 記得導出這個新函式
    clearCart,
    totalCartPrice,
    totalCartCount
  };
}