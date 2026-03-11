import { MessageSquare } from 'lucide-react';

interface Props {
  unreadCount: number;
  onClick:     () => void;
}

export const MessageButton = ({ unreadCount, onClick }: Props) => (
  <button
    onClick={onClick}
    className="
      fixed bottom-6 right-6 z-40
      flex items-center gap-2 px-5 py-3
      bg-white text-gray-700 font-medium
      rounded-2xl shadow-xl border border-gray-200
      hover:shadow-2xl hover:bg-gray-50
      transition-all duration-200
    "
  >
    <div className="relative">
      <MessageSquare className="w-5 h-5 text-gray-500" />
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
    <span>Messages</span>
  </button>
);