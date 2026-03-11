import { useRef, useEffect, useCallback } from 'react';
import { ChatMessage }     from './ChatMessage';
import { ChatInput }       from './ChatInput';
import { TypingIndicator } from './TyipingIndicator';
import { useMessages }     from '../hooks/useMessages';
import { useWebSocket }    from '../hooks/useWebSocket';
import type { Conversation, MessageItem } from '../types/messages.types';

interface Props {
  conversation:  Conversation;
  currentUserId: number;
  onNewMessage:  (msg: MessageItem) => void;
  typingUser:    { name: string } | null;
  setTypingUser: (v: { name: string } | null) => void;
}

export const ChatWindow = ({
  conversation,
  currentUserId,
  onNewMessage,
  typingUser,
  setTypingUser,
}: Props) => {
  const other       = conversation.other_participant;
  const bottomRef   = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, isLoading, appendMessage } = useMessages(conversation.id);

  const handleIncomingMessage = useCallback((msg: MessageItem) => {
    appendMessage(msg);
    onNewMessage(msg);
  }, [appendMessage, onNewMessage]);

  const handleTyping = useCallback((userId: number, name: string, isTyping: boolean) => {
    if (userId === currentUserId) return;
    if (isTyping) {
      setTypingUser({ name });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingUser(null), 3000);
    } else {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      setTypingUser(null);
    }
  }, [currentUserId, setTypingUser]);

  const { isConnected, sendMessage, sendTyping, sendMarkRead } = useWebSocket({
    conversationId: conversation.id,
    onMessage:      handleIncomingMessage,
    onTyping:       handleTyping,
  });

  // Mark read on open
  useEffect(() => { sendMarkRead(); }, [conversation.id, sendMarkRead]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const initials = other?.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white flex-shrink-0">
        {other?.avatar ? (
          <img src={other.avatar} alt={other.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
            {other?.full_name ?? 'Unknown'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {other?.role
              ? other.role.charAt(0) + other.role.slice(1).toLowerCase()
              : ''}
            {(other as any)?.clinic_branch_name
              ? ` · ${(other as any).clinic_branch_name}`
              : ''}
          </p>
        </div>

        {/* WS status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-300 animate-pulse'}`} />
          <span className="text-[10px] text-gray-400">{isConnected ? 'Online' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm font-medium text-gray-500">No messages yet</p>
            <p className="text-xs">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} currentUserId={currentUserId} />
          ))
        )}

        {typingUser && <TypingIndicator name={typingUser.name} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} onTyping={sendTyping} disabled={!isConnected} />
    </div>
  );
};