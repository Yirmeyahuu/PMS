import axiosInstance from '@/lib/axios';
import type { Conversation, MessageItem, Participant } from '../types/messages.types';

const BASE = '/conversations';

export const getConversations = (): Promise<Conversation[]> =>
  axiosInstance.get(`${BASE}/`).then(r => r.data);

export const startConversation = (recipient_id: number): Promise<Conversation> =>
  axiosInstance.post(`${BASE}/start/`, { recipient_id }).then(r => r.data);

export const getMessages = (conversationId: number): Promise<MessageItem[]> =>
  axiosInstance.get(`${BASE}/${conversationId}/messages/`).then(r => r.data);

export const markRead = (conversationId: number): Promise<void> =>
  axiosInstance.post(`${BASE}/${conversationId}/mark_read/`).then(r => r.data);

export const getContacts = (): Promise<Participant[]> =>
  axiosInstance.get(`${BASE}/contacts/`).then(r => r.data);

export const getUnreadCount = (): Promise<{ unread_count: number }> =>
  axiosInstance.get(`${BASE}/unread_count/`).then(r => r.data);