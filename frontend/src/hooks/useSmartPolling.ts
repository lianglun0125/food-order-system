import { useEffect, useRef, useCallback } from 'react';

export function useSmartPolling(
  callback: () => Promise<void> | void,
  intervalMs: number,
  isEnabled: boolean = true
) {
  const savedCallback = useRef(callback);
  const isPolling = useRef(false);

  // 保持 callback 是最新的
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const tick = useCallback(async () => {
    if (document.hidden) return; // ★ 如果視窗在背景，直接跳過這次輪詢
    if (isPolling.current) return; // 防止上一次請求還沒回來，下一次就開始了

    isPolling.current = true;
    try {
      await savedCallback.current();
    } catch (error) {
      console.error('Polling error:', error);
    } finally {
      isPolling.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    // 1. 初始執行一次
    tick();

    // 2. 設定輪詢
    const id = setInterval(tick, intervalMs);

    // 3. 監聽視窗切換事件 (使用者切回來時立刻更新一次)
    const handleVisibilityChange = () => {
      if (!document.hidden && isEnabled) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, isEnabled, tick]);
}