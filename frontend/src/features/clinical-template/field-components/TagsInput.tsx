import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagsInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const TagsInput: React.FC<TagsInputProps> = ({
  label, value = [], onChange, error, required, disabled, placeholder,
}) => {
  const [input, setInput] = useState('');
  const tags = Array.isArray(value) ? value : [];

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        className={`flex flex-wrap gap-1.5 min-h-[42px] w-full text-sm border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${disabled ? 'bg-gray-50' : 'bg-white'}`}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-medium px-2 py-0.5 rounded-full"
          >
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-sky-900">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? (placeholder || 'Type and press Enter...') : ''}
            className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
          />
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a tag</p>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};