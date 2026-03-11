import { format } from 'date-fns';
import type { MessageItem } from '../types/messages.types';

interface Props {
  message:       MessageItem;
  currentUserId: number;
}

export const ChatMessage = ({ message, currentUserId }: Props) => {
  const isMine   = message.sender_id === currentUserId;
  const initials = message.sender_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && (
        <div className="flex-shrink-0 mb-1">
          {message.sender_avatar ? (
            <img src={message.sender_avatar} alt={message.sender_name} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] font-semibold text-white">
              {initials}
            </div>
          )}
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