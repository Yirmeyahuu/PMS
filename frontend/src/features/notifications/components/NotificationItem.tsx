import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays } from 'lucide-react';
import type { Notification } from '../types/notifications.types';

interface Props {
  notification: Notification;
  onMarkRead: (id: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric',
  });
}

const TYPE_CONFIG = {
  NEW_BOOKING: {
    icon: Calendar,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    dot: 'bg-sky-500',
  },
  DAILY_SUMMARY: {
    icon: CalendarDays,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    dot: 'bg-violet-500',
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export const NotificationItem: React.FC<Props> = ({ notification, onMarkRead }) => {
  const navigate  = useNavigate();
  const config    = TYPE_CONFIG[notification.notification_type] ?? TYPE_CONFIG.NEW_BOOKING;
  const Icon      = config.icon;

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        hover:bg-gray-50 border-b border-gray-100 last:border-0
        ${!notification.is_read ? 'bg-sky-50/40' : ''}
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${config.iconBg}`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${config.dot}`} />
          )}
        </div>

        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-gray-400">
            {formatRelativeTime(notification.created_at)}
          </span>
          {notification.clinic_branch_name && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-[11px] text-gray-400 truncate">
                {notification.clinic_branch_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};