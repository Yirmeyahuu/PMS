import { useState, useEffect, useRef, useCallback } from 'react';
import { getUnreadCount } from '../services/message.api';

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:8000';

const getToken = (): string | null => {
  const direct = localStorage.getItem('access_token');
  if (direct) return direct;
  try {
    const s = localStorage.getItem('auth-storage');
    if (s) {
      const p = JSON.parse(s);
      return p?.state?.tokens?.access || p?.tokens?.access || null;
    }
  } catch { /* ignore */ }
  return null;
};

export const useUnreadCount = (isAuthenticated: boolean) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);

  const fetchInitial = useCallback(async () => {
    try {
      const { unread_count } = await getUnreadCount();
      if (mountedRef.current) setUnreadCount(unread_count);
    } catch { /* silent */ }
  }, []);

  const connectPresence = useCallback(() => {
    if (!isAuthenticated) return;
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/presence/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setUnreadCount(prev => prev + 1);
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connectPresence();
      }, 5000);
    };

    ws.onerror = () => ws.close();
  }, [isAuthenticated]);

  useEffect(() => {
    mountedRef.current = true;
    if (isAuthenticated) {
      fetchInitial();
      connectPresence();
    }
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated, fetchInitial, connectPresence]);

  const decrementBy = useCallback((amount: number) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  const reset = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, setUnreadCount, decrementBy, reset };
};