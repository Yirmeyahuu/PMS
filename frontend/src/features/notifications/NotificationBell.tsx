import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './hooks/useNotifications';
import { NotificationPanel } from './components/NotificationPanel';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications(isOpen);

  return (
    <>
      {/* ── Bell Button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="
          fixed bottom-6 right-[11rem] z-40
          flex items-center justify-center
          px-5 py-3
          bg-sky-500 text-white font-medium
          rounded-2xl shadow-xl border border-sky-500
          hover:shadow-2xl hover:bg-sky-600
          transition-all duration-200 cursor-pointer
        "
        aria-label="Notifications"
        title="Notifications"
      >
        <div className="relative">
          <Bell className="w-5 h-5 text-white" />
          {unreadCount > 0 && (
            <span className="
              absolute -top-2 -right-2
              min-w-[18px] h-[18px] px-1
              bg-red-500 text-white text-[10px] font-bold
              rounded-full flex items-center justify-center leading-none
            ">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onLoadMore={loadMore}
      />
    </>
  );
};