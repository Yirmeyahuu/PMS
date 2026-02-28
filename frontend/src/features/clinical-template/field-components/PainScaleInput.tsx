import React from 'react';

interface PainScaleInputProps {
  label: string;
  value: string | number;
  onChange: (value: number) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export const PainScaleInput: React.FC<PainScaleInputProps> = ({
  label, value, onChange, error, required, disabled, min = 0, max = 10,
}) => {
  const current = Number(value) || 0;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  const getColor = (n: number) => {
    if (n <= 3) return 'bg-green-500';
    if (n <= 6) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
        <span className="ml-2 text-sky-600 font-bold">{current}</span>
      </label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all border-2 ${
              current === n
                ? `${getColor(n)} text-white border-transparent scale-110`
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-sky-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>No pain</span>
        <span>Worst pain</span>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};