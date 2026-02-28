import React from 'react';
import type { FieldOption } from '@/types/clinicalTemplate';

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FieldOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label, value, onChange, options, error, required, disabled, placeholder,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-50 disabled:text-gray-500 bg-white ${
        error ? 'border-red-400' : 'border-gray-300'
      }`}
    >
      <option value="">{placeholder || 'Select an option'}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);