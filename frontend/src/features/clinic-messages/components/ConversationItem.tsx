import type { Conversation } from '../types/messages.types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  conversation: Conversation;
  isActive:     boolean;
  onClick:      () => void;
}

const Avatar = ({ name, src, size = 9 }: { name: string; src: string | null; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const sizeClass = `w-${size} h-${size}`;
  return src ? (
    <img src={src} alt={name} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
};

export const ConversationItem = ({ conversation, isActive, onClick }: Props) => {
  const other = conversation.other_participant;

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5
        text-left rounded-xl transition-all duration-150
        ${isActive
          ? 'bg-blue-50 border border-blue-100 shadow-sm'
          : 'hover:bg-gray-50 border border-transparent'
        }
      `}
    >
      {/* Avatar with unread badge */}
      <div className="relative flex-shrink-0">
        <Avatar name={other?.full_name ?? '?'} src={other?.avatar ?? null} size={9} />
        {conversation.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-sm truncate ${isActive ? 'font-semibold text-blue-700' : 'font-medium text-gray-800'}`}>
            {other?.full_name ?? 'Unknown'}
          </span>
          {conversation.last_message && (
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {formatDistanceToNow(new Date(conversation.last_message.created_at))}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate leading-tight">
          {conversation.last_message?.body ?? 'No messages yet'}
        </p>
      </div>

      <span className={`text-xs flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>›</span>
    </button>
  );
};