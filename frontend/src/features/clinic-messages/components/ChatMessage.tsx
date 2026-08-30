import { format } from 'date-fns';
import type { MessageItem } from '../types/messages.types';
import { UserAvatar } from '@/components/UserAvatar';

interface Props {
  message:       MessageItem;
  currentUserId: number;
}

export const ChatMessage = ({ message, currentUserId }: Props) => {
  const isMine   = message.sender_id === currentUserId;

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && (
        <div className="flex-shrink-0 mb-1">
          <UserAvatar
            avatarUrl={message.sender_avatar ?? null}
            name={message.sender_name}
            className="w-7 h-7"
          />
        </div>
      )}

      <div className="max-w-[70%]">
        {!isMine && (
          <p className="text-[10px] text-gray-400 mb-0.5 ml-1">{message.sender_name}</p>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMine
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}>
          {message.body}
        </div>
        <p className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'text-right pr-1' : 'pl-1'}`}>
          {format(new Date(message.created_at), 'h:mm a')}
        </p>
      </div>

      {isMine && <div className="w-7 flex-shrink-0" />}
    </div>
  );
};