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

export const MessageUtility = ({ currentUserId, onClose, onUnreadChange }: Props) => {
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
    <div className="flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in duration-200">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white shadow-sm z-10">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">Messages</h3>
          {activeConversation?.other_participant && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500 truncate max-w-[150px]">
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
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT COLUMN - List of conversations/contacts */}
        <div 
          className={`
            w-full md:w-64 lg:w-72 flex-shrink-0 border-r border-gray-100 overflow-hidden flex flex-col
            ${activeConversation ? 'hidden md:flex' : 'flex'}
          `}
        >
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

        {/* RIGHT COLUMN - Active Chat */}
        <div 
          className={`
            flex-1 flex flex-col overflow-hidden bg-white
            ${!activeConversation ? 'hidden md:flex' : 'flex'}
          `}
        >
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              currentUserId={currentUserId}
              onNewMessage={handleNewMessage}
              typingUser={typingUser}
              setTypingUser={setTypingUser}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 gap-3 p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Select a conversation</p>
                <p className="text-xs text-gray-400 mt-1">or start a new message</p>
              </div>
              <button
                onClick={handleNewChat}
                className="mt-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-xl transition-colors shadow-sm"
              >
                + New Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
