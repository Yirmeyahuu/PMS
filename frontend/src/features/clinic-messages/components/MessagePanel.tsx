import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { ChatWindow }       from './ChatWindow';
import { ContactList }      from './ContactList';
import { useConversations } from '../hooks/useConversations';
import type { Conversation, MessageItem, Participant } from '../types/messages.types';

interface Props {
  currentUserId:  number;
  onClose:        () => void;
  onUnreadChange: (delta: number) => void;
}

export const MessagePanel = ({ currentUserId, onClose, onUnreadChange }: Props) => {
  const [showContacts, setShowContacts] = useState(false);
  const [typingUser,   setTypingUser]   = useState<{ name: string } | null>(null);

  const {
    conversations,
    contacts,
    isLoading,
    contactsLoading,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    fetchContacts,
    openConversation,
    updateConversationLastMessage,
    clearUnread,
  } = useConversations();

  // Fetch conversations when modal mounts
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    const prevUnread = conv.unread_count;
    setActiveConversation(conv);
    clearUnread(conv.id);
    setShowContacts(false);
    if (prevUnread > 0) onUnreadChange(-prevUnread);
  }, [setActiveConversation, clearUnread, onUnreadChange]);

  const handleNewChat = useCallback(() => {
    fetchContacts();
    setShowContacts(true);
  }, [fetchContacts]);

  const handleSelectContact = useCallback(async (contact: Participant) => {
    const conv = await openConversation(contact.id);
    if (conv) {
      setActiveConversation(conv);
      setShowContacts(false);
    }
  }, [openConversation, setActiveConversation]);

  const handleNewMessage = useCallback((msg: MessageItem) => {
    if (activeConversation) {
      updateConversationLastMessage(activeConversation.id, msg);
    }
  }, [activeConversation, updateConversationLastMessage]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — centered */}
      <div
        className="
          fixed inset-0 z-50 flex items-center justify-center p-4
          pointer-events-none
        "
      >
        <div
          className="
            pointer-events-auto
            w-full max-w-4xl h-[600px]
            bg-white rounded-2xl shadow-2xl
            flex flex-col overflow-hidden
            border border-gray-200
          "
          onClick={e => e.stopPropagation()}
        >
          {/* ── Modal header ── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-800">Messages</h3>
              {activeConversation?.other_participant && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">
                    {activeConversation.other_participant.full_name}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Body: left sidebar + right chat ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── LEFT COLUMN ── */}
            <div className="w-64 flex-shrink-0 border-r border-gray-100 overflow-hidden flex flex-col">
              {showContacts ? (
                <ContactList
                  contacts={contacts}
                  isLoading={contactsLoading}
                  onSelect={handleSelectContact}
                  onBack={() => setShowContacts(false)}
                />
              ) : (
                <ConversationList
                  conversations={conversations}
                  contacts={contacts}
                  activeId={activeConversation?.id ?? null}
                  isLoading={isLoading}
                  onSelect={handleSelectConversation}
                  onNewChat={handleNewChat}
                />
              )}
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeConversation ? (
                <ChatWindow
                  conversation={activeConversation}
                  currentUserId={currentUserId}
                  onNewMessage={handleNewMessage}
                  typingUser={typingUser}
                  setTypingUser={setTypingUser}
                />
              ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 gap-3">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-3xl">💬</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Select a conversation</p>
                  <p className="text-xs text-gray-400">or start a new message</p>
                  <button
                    onClick={handleNewChat}
                    className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    + New Message
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};