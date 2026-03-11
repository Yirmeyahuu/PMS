import { useState, useCallback, useEffect, useRef } from 'react';
import { getMessages, markRead } from '../services/message.api';
import type { MessageItem } from '../types/messages.types';

export const useMessages = (conversationId: number | null) => {
  const [messages,   setMessages]   = useState<MessageItem[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      await markRead(conversationId);
    } catch (err) {
      console.error('fetchMessages error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    fetchMessages();
  }, [fetchMessages]);

  /* Scroll to bottom whenever messages change */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const appendMessage = useCallback((msg: MessageItem) => {
    setMessages(prev => {
      // Deduplicate by id
      if (prev.find(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  return { messages, isLoading, appendMessage, bottomRef };
};