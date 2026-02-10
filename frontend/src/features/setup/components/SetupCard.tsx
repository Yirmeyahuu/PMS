import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { SetupCard as SetupCardType } from '../types/setup.types';

interface SetupCardProps {
  card: SetupCardType;
  onOptionClick: (cardId: string, optionId: string) => void;
}

export const SetupCard: React.FC<SetupCardProps> = ({ card, onOptionClick }) => {
  const Icon = card.icon;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      {/* Card Header */}
      <div className={`${card.bgColor} p-6 border-b-2 border-gray-200`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{card.title}</h3>
        </div>
      </div>

      {/* Card Options */}
      <div className="p-4">
        <div className="space-y-2">
          {card.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onOptionClick(card.id, option.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left group"
            >
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {option.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};