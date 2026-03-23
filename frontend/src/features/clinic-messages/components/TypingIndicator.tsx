interface Props {
  name: string;
}

export const TypingIndicator = ({ name }: Props) => (
  <div className="flex items-end gap-2">
    <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
      <span className="text-[10px] text-gray-400 mr-1">{name} is typing</span>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  </div>
);