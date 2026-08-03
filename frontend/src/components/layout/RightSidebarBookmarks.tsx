import React, { useState, useCallback } from 'react';
import { MessageSquare, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { MessagePanel } from '@/features/clinic-messages/components/MessagePanel';
import { useUnreadCount } from '@/features/clinic-messages/hooks/useUnreadCount';
import { NotificationPanel } from '@/features/notifications/components/NotificationPanel';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { pushToast } from '@/features/notifications/store/toastStore';
import { getCategory } from '@/features/notifications/types/notifications.types';
import type { Notification } from '@/features/notifications/types/notifications.types';

const ALLOWED_ROLES = ['ADMIN', 'STAFF', 'PRACTITIONER', 'ADMIN_ASSISTANT'] as const;

export const RightSidebarBookmarks: React.FC = () => {
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

  // --- Render ---
  return (
    <>
      {/* Container for Bookmark Tabs attached to the right edge */}
      <div className="fixed top-1/2 right-0 -translate-y-1/2 z-40 flex flex-col gap-1 items-end">

        {/* Messages Bookmark */}
        {showMessages && (
          <button
            onClick={() => setActivePanel(prev => prev === 'MESSAGES' ? 'NONE' : 'MESSAGES')}
            aria-label="Open messages"
            title="Messages"
            className={`
              relative flex items-center justify-center 
              bg-primary-gradient text-white font-medium
              rounded-l-xl shadow-md transition-all duration-300 origin-right
              hover:brightness-90 hover:scale-100 hover:-translate-x-2 hover:shadow-2xl
              ${activePanel === 'MESSAGES' ? 'opacity-100 shadow-xl pr-3' : 'opacity-80'}
            `}
            style={{
              padding: '24px 12px',
              minHeight: '150px',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0
            }}
          >
            <div className="flex items-center gap-2 relative">
              <MessageSquare className="w-5 h-5 text-white" />
              {msgUnread > 0 && (
                <span className="
                  absolute -top-3 -right-3
                  bg-red-500 text-white text-[10px] font-bold
                  rounded-full flex items-center justify-center leading-none
                  w-4 h-4 shrink-0
                ">
                  {msgUnread > 99 ? '99+' : msgUnread}
                </span>
              )}
            </div>
          </button>
        )}

        {/* Notifications Bookmark */}
        <button
          onClick={() => setActivePanel(prev => prev === 'NOTIFICATIONS' ? 'NONE' : 'NOTIFICATIONS')}
          aria-label="Open notifications"
          title="Notifications"
          className={`
            relative flex items-center justify-center 
            bg-primary-gradient text-white font-medium
            rounded-l-xl shadow-md transition-all duration-300 origin-right
            hover:brightness-90 hover:scale-100 hover:-translate-x-2 hover:shadow-2xl
            ${activePanel === 'NOTIFICATIONS' ? 'opacity-100 shadow-xl pr-3' : 'opacity-80'}
          `}
          style={{
            padding: '24px 12px',
            minHeight: '150px',
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0
          }}
        >
          <div className="flex items-center gap-2 relative">
            <Bell className="w-5 h-5 text-white" />
            {notifUnread > 0 && (
              <span className="
                absolute -top-3 -right-3
                bg-red-500 text-white text-[10px] font-bold
                rounded-full flex items-center justify-center leading-none
                w-4 h-4 shrink-0
              ">
                {notifUnread > 99 ? '99+' : notifUnread}
              </span>
            )}
          </div>
        </button>

      </div>

      {/* Panels */}
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
          markRead={markRead}
          markAllRead={markAllRead}
          loadMore={loadMore}
        />
      )}
    </>
  );
};
