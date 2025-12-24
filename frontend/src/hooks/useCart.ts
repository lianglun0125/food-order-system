import { useState, useEffect } from 'react';

// 定義原本的型別 (建議把型別定義抽到 types.ts 檔案共用)
export type CartItem = {
  id: string; n: string; price: number; count: number; optionName: string; 
  choice?: string; extras?: any[]; sugar?: string; ice?: string; note?: string; owner: string;
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

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    if (roomId) localStorage.removeItem(`cart-${roomId}`);
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + (item.price * item.count), 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.count, 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    totalCartPrice,
    totalCartCount
  };
}