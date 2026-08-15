import React, { useCallback, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { MessagePanel } from '@/features/clinic-messages/components/MessagePanel';
import { useUnreadCount } from '@/features/clinic-messages/hooks/useUnreadCount';
import { NotificationPanel } from '@/features/notifications/components/NotificationPanel';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { pushToast } from '@/features/notifications/store/toastStore';
import { getCategory } from '@/features/notifications/types/notifications.types';
import type { Notification } from '@/features/notifications/types/notifications.types';
import { MessageSquare, Bell } from 'lucide-react';

const ALLOWED_ROLES = ['ADMIN', 'STAFF', 'PRACTITIONER', 'ADMIN_ASSISTANT'] as const;

export const RightUtilityPanel: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'NONE' | 'MESSAGES' | 'NOTIFICATIONS'>('NONE');

  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // --- Messages Logic ---
  const showMessages = user && ALLOWED_ROLES.includes(user.role as any);
  const { unreadCount: msgUnread, setUnreadCount: setMsgUnread, decrementBy: msgDecrementBy } = useUnreadCount(isAuthenticated && !!showMessages);

  const handleMsgUnreadChange = (delta: number) => {
    if (delta < 0) msgDecrementBy(Math.abs(delta));
    else setMsgUnread(prev => prev + delta);
  };

  // --- Notifications Logic ---
  const handleIncomingNotification = useCallback((n: Notification) => {
    pushToast({
      title: n.title,
      message: n.message,
      category: getCategory(n.notification_type),
      created_at: n.created_at,
    });
  }, []);

  const {
    notifications,
    unreadCount: notifUnread,
    isLoading,
    isLoadingMore,
    hasMore,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications(activePanel === 'NOTIFICATIONS', handleIncomingNotification);

  return (
    <>
      <aside className="hidden lg:flex fixed right-0 top-[56px] bottom-0 w-8 flex-col h-[calc(100vh-56px)] border-l border-gray-300 z-40 shadow-[-4px_0_20px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Top 50% - Messages */}
        {showMessages ? (
          <button
            onClick={() => setActivePanel(prev => prev === 'MESSAGES' ? 'NONE' : 'MESSAGES')}
            aria-label="Open messages"
            title="Messages"
            className={`
              flex-1 w-full flex flex-col items-center justify-center transition-all relative border-b border-black/10 shadow-sm
              ${activePanel === 'MESSAGES' ? 'bg-[#5CDB95] brightness-90 shadow-inner text-green-900' : 'bg-[#5CDB95] brightness-95 text-green-900 hover:brightness-90'}
            `}
          >
            <MessageSquare className="w-4 h-4 drop-shadow-sm" />
            {msgUnread > 0 && (
              <span className="absolute top-[20%] right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-sm">
                {msgUnread > 99 ? '99+' : msgUnread}
              </span>
            )}
          </button>
        ) : (
          <div className="flex-1 w-full bg-[#5CDB95] brightness-95 border-b border-black/10 shadow-sm" />
        )}

        {/* Bottom 50% - Notifications */}
        <button
          onClick={() => setActivePanel(prev => prev === 'NOTIFICATIONS' ? 'NONE' : 'NOTIFICATIONS')}
          aria-label="Open notifications"
          title="Notifications"
          className={`
            flex-1 w-full flex flex-col items-center justify-center transition-all relative shadow-sm
            ${activePanel === 'NOTIFICATIONS' ? 'bg-[#F9AD43] brightness-90 shadow-inner text-white' : 'bg-[#F9AD43] brightness-95 text-white hover:brightness-90'}
          `}
        >
          <Bell className="w-4 h-4 drop-shadow-sm" />
          {notifUnread > 0 && (
            <span className="absolute top-[20%] right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-sm">
              {notifUnread > 99 ? '99+' : notifUnread}
            </span>
          )}
        </button>
      </aside>

      {/* Mobile Floating Triggers (Visible only on small screens) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {showMessages && (
          <button
            onClick={() => setActivePanel(prev => prev === 'MESSAGES' ? 'NONE' : 'MESSAGES')}
            className={`w-12 h-12 text-white rounded-full shadow-xl flex items-center justify-center relative transition-colors ${activePanel === 'MESSAGES' ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <MessageSquare className="w-5 h-5" />
            {msgUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                {msgUnread > 99 ? '99+' : msgUnread}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActivePanel(prev => prev === 'NOTIFICATIONS' ? 'NONE' : 'NOTIFICATIONS')}
          className={`w-12 h-12 text-white rounded-full shadow-xl flex items-center justify-center relative transition-colors ${activePanel === 'NOTIFICATIONS' ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
        >
          <Bell className="w-5 h-5" />
          {notifUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
              {notifUnread > 99 ? '99+' : notifUnread}
            </span>
          )}
        </button>
      </div>

      {/* Modals */}
      {activePanel === 'MESSAGES' && showMessages && user && (
        <MessagePanel
          currentUserId={user.id}
          onClose={() => setActivePanel('NONE')}
          onUnreadChange={handleMsgUnreadChange}
        />
      )}

      {activePanel === 'NOTIFICATIONS' && (
        <NotificationPanel
          isOpen={true}
          onClose={() => setActivePanel('NONE')}
          notifications={notifications}
          unreadCount={notifUnread}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onLoadMore={loadMore}
        />
      )}
    </>
  );
};
