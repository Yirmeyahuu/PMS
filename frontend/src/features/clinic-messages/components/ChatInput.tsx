import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend:    (body: string) => void;
  onTyping:  (isTyping: boolean) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, onTyping, disabled }: Props) => {
  const [value,     setValue]     = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (!isTypingRef.current) { isTypingRef.current = true; onTyping(true); }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        isTypingRef.current = false;
        onTyping(false);
      }, 1500);
    },
    [onTyping]
  );

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    onTyping(false);
  }, [value, disabled, onSend, onTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    },
    [handleSend]
  );

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white">
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message here..."
        disabled={disabled}
        className="flex-1 px-4 py-2.5 text-sm bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50 transition-all"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="w-9 h-9 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
};