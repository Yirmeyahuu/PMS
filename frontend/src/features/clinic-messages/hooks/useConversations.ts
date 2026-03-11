import { useState, useCallback, useMemo } from 'react';
import {
  getConversations,
  startConversation,
  getContacts,
} from '../services/message.api';
import type { Conversation, Participant, MessageItem } from '../types/messages.types';

export const useConversations = () => {
  const [conversations,      setConversations]      = useState<Conversation[]>([]);
  const [contacts,           setContacts]           = useState<Participant[]>([]);
  const [isLoading,          setIsLoading]          = useState(false);
  const [contactsLoading,    setContactsLoading]    = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('fetchConversations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (err) {
      console.error('fetchContacts error:', err);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const openConversation = useCallback(async (recipientId: number) => {
    try {
      const conv = await startConversation(recipientId);
      setActiveConversation(conv);
      setConversations(prev => {
        const exists = prev.find(c => c.id === conv.id);
        if (exists) return prev.map(c => (c.id === conv.id ? conv : c));
        return [conv, ...prev];
      });
      return conv;
    } catch (err) {
      console.error('openConversation error:', err);
      return null;
    }
  }, []);

  const updateConversationLastMessage = useCallback(
    (conversationId: number, message: MessageItem) => {
      setConversations(prev =>
        [...prev]
          .map(c =>
            c.id === conversationId
              ? { ...c, last_message: message, updated_at: message.created_at }
              : c
          )
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
      );
    },
    []
  );

  const incrementUnread = useCallback((conversationId: number) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId ? { ...c, unread_count: c.unread_count + 1 } : c
      )
    );
  }, []);

  const clearUnread = useCallback((conversationId: number) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
  }, []);

  /* Group contacts by their clinic branch (role used as sub-group) */
  const contactsByBranch = useMemo(() => {
    return contacts.reduce<Record<string, Participant[]>>((acc, c) => {
      const branch = (c as any).clinic_branch_name || 'Main Branch';
      if (!acc[branch]) acc[branch] = [];
      acc[branch].push(c);
      return acc;
    }, {});
  }, [contacts]);

  return {
    conversations,
    contacts,
    contactsByBranch,
    isLoading,
    contactsLoading,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    fetchContacts,
    openConversation,
    updateConversationLastMessage,
    incrementUnread,
    clearUnread,
  };
};