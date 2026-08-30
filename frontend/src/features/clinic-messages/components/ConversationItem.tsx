import type { Conversation } from '../types/messages.types';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/UserAvatar';

interface Props {
  conversation: Conversation;
  isActive:     boolean;
  onClick:      () => void;
}

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
        <UserAvatar
          avatarUrl={other?.avatar ?? null}
          name={other?.full_name ?? ''}
          className="w-9 h-9"
        />
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