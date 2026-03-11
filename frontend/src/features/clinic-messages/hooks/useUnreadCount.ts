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

const MAX_RETRIES    = 5;
const BASE_DELAY_MS  = 3000;

export const useUnreadCount = (isAuthenticated: boolean) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);
  const retriesRef   = useRef(0);

  const fetchInitial = useCallback(async () => {
    try {
      const { unread_count } = await getUnreadCount();
      if (mountedRef.current) setUnreadCount(unread_count);
    } catch { /* silent */ }
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (wsRef.current) {
      // Remove handlers before closing to prevent reconnect loop on unmount
      wsRef.current.onopen    = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror   = null;
      wsRef.current.onclose   = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectPresence = useCallback(() => {
    if (!mountedRef.current || !isAuthenticated) return;

    // Don't open a second connection if one is already open/connecting
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
       wsRef.current.readyState === WebSocket.CONNECTING)
    ) return;

    const token = getToken();
    if (!token) {
      // Token not ready yet — retry once after a short delay
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connectPresence();
      }, 1000);
      return;
    }

    // Stop retrying after MAX_RETRIES
    if (retriesRef.current >= MAX_RETRIES) {
      console.warn('[Presence WS] Max retries reached. Giving up.');
      return;
    }

    const ws = new WebSocket(`${WS_BASE}/ws/presence/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      retriesRef.current = 0; // Reset on successful connection
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setUnreadCount(prev => prev + 1);
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => {
      // Let onclose handle reconnect
      ws.close();
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;

      retriesRef.current += 1;

      // Exponential backoff: 3s, 6s, 12s, 24s, 48s
      const delay = Math.min(BASE_DELAY_MS * 2 ** (retriesRef.current - 1), 48000);

      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connectPresence();
      }, delay);
    };
  }, [isAuthenticated, cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    retriesRef.current = 0;

    if (isAuthenticated) {
      fetchInitial();

      // Small delay to ensure token is in localStorage after login
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connectPresence();
      }, 500);
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [isAuthenticated, fetchInitial, connectPresence, cleanup]);

  const decrementBy = useCallback((amount: number) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  const reset = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, setUnreadCount, decrementBy, reset };
};