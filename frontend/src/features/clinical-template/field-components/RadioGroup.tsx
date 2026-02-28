import React from 'react';
import type { FieldOption } from '@/types/clinicalTemplate';

interface RadioGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FieldOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label, value, onChange, options, error, required, disabled,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="w-4 h-4 text-sky-600 border-gray-300 focus:ring-sky-500"
          />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);