import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSIncomingEvent, MessageItem } from '../types/messages.types';

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

interface UseWebSocketOptions {
  conversationId: number | null;
  onMessage:      (msg: MessageItem) => void;
  onTyping?:      (userId: number, name: string, isTyping: boolean) => void;
}

export const useWebSocket = ({
  conversationId,
  onMessage,
  onTyping,
}: UseWebSocketOptions) => {
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);
  const onMessageRef = useRef(onMessage);
  const onTypingRef  = useRef(onTyping);
  const [isConnected, setIsConnected] = useState(false);

  // Keep refs fresh without re-triggering connect
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypingRef.current  = onTyping;  }, [onTyping]);

  const connect = useCallback(() => {
    if (!conversationId) return;
    const token = getToken();
    if (!token) return;

    // Close existing connection first
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const url = `${WS_BASE}/ws/messages/${conversationId}/?token=${token}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setIsConnected(true);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data: WSIncomingEvent = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          onMessageRef.current(data.message);
        } else if (data.type === 'typing' && onTypingRef.current) {
          onTypingRef.current(data.user_id, data.name, data.is_typing);
        }
      } catch {
        console.error('WS parse error');
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 3000);
    };

    ws.onerror = () => ws.close();
  }, [conversationId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((body: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'send_message', body }));
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'typing', is_typing: isTyping }));
    }
  }, []);

  const sendMarkRead = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'mark_read' }));
    }
  }, []);

  return { isConnected, sendMessage, sendTyping, sendMarkRead };
};