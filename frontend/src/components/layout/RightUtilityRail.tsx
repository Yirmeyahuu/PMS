import React, { useCallback, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { MessageUtility } from '@/features/clinic-messages/components/MessageUtility';
import { useUnreadCount } from '@/features/clinic-messages/hooks/useUnreadCount';
import { NotificationUtility } from '@/features/notifications/components/NotificationUtility';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { pushToast } from '@/features/notifications/store/toastStore';
import { getCategory } from '@/features/notifications/types/notifications.types';
import type { Notification } from '@/features/notifications/types/notifications.types';
import { MessageSquare, Bell, Headphones } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { UserFeedbackModal } from '@/features/support/components/UserFeedbackModal';

const ALLOWED_ROLES = ['ADMIN', 'STAFF', 'PRACTITIONER', 'ADMIN_ASSISTANT'] as const;

export const RightUtilityRail: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'NONE' | 'MESSAGES' | 'NOTIFICATIONS'>('NONE');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const location = useLocation();

  // Auto-detect module based on current URL path
  const detectModule = (): string => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dashboard')) return 'DASHBOARD';
    if (path.includes('/diary')) return 'DIARY';
    if (path.includes('/patients')) {
      if (path.includes('/cases')) return 'CASES';
      if (path.includes('/clinical-documentation')) return 'CLINICAL_DOCUMENTATION';
      if (path.includes('/notes')) return 'CLINICAL_NOTES';
      if (path.includes('/letters')) return 'LETTERS';
      return 'PATIENTS';
    }
    if (path.includes('/appointments')) return 'APPOINTMENTS';
    if (path.includes('/invoices') || path.includes('/billing')) return 'BILLING';
    if (path.includes('/reports')) return 'REPORTS';
    if (path.includes('/setup') || path.includes('/settings')) return 'SETUP';
    if (path.includes('/services')) return 'SERVICES';
    if (path.includes('/packages')) return 'SESSION_PACKAGES';
    if (path.includes('/sms')) return 'SMS';
    return 'OTHER';
  };

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
      {/* ── RAIL (All screens) ── */}
      {/* Always 32px wide tab bar */}
      <aside
        className="flex flex-col flex-shrink-0 h-full w-8 bg-white border-l border-gray-100 relative z-30 shadow-[-4px_0_20px_rgba(0,0,0,0.05)]"
      >


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

        {/* Middle - Notifications */}
        <button
          onClick={() => setActivePanel(prev => prev === 'NOTIFICATIONS' ? 'NONE' : 'NOTIFICATIONS')}
          aria-label="Open notifications"
          title="Notifications"
          className={`
              flex-1 w-full flex flex-col items-center justify-center transition-all relative border-b border-black/10 shadow-sm
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

        {/* Bottom - Support */}
        <button
          onClick={() => setIsSupportOpen(true)}
          aria-label="Customer Service and Feedback"
          title="Support"
          className="flex-1 w-full flex flex-col items-center justify-center transition-all relative shadow-sm bg-[#3B82F6] brightness-95 text-white hover:brightness-90"
        >
          <Headphones className="w-4 h-4 drop-shadow-sm" />
        </button>
      </aside>


      {/* Universal Modal Wrappers */}
      {activePanel !== 'NONE' && (
        <div className="fixed inset-0 z-50 flex p-4 bg-black/50 backdrop-blur-sm items-center justify-center lg:justify-end lg:pr-12">
          <div onClick={() => setActivePanel('NONE')} className="absolute inset-0" />
          <div className={`relative z-10 w-full h-[80vh] lg:h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col ${activePanel === 'MESSAGES' ? 'max-w-4xl' : 'max-w-md'}`}>
            {activePanel === 'MESSAGES' && showMessages && user && (
              <MessageUtility
                currentUserId={user.id}
                onClose={() => setActivePanel('NONE')}
                onUnreadChange={handleMsgUnreadChange}
              />
            )}
            {activePanel === 'NOTIFICATIONS' && (
              <NotificationUtility
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
          </div>
        </div>
      )}

      <UserFeedbackModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        defaultModule={detectModule()}
      />
    </>
  );
};
