import React from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import type { SetupCard as SetupCardType } from '../types/setup.types';

interface SetupCardProps {
  card: SetupCardType;
  onOptionClick: (cardId: string, optionId: string) => void;
  restrictedOptionIds?: string[];
}

export const SetupCard: React.FC<SetupCardProps> = ({ card, onOptionClick, restrictedOptionIds = [] }) => {
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
          {card.options.map((option) => {
            const isRestricted = restrictedOptionIds.includes(option.id);

            return (
              <div key={option.id} className="relative group/option">
                <button
                  onClick={() => !isRestricted && onOptionClick(card.id, option.id)}
                  disabled={isRestricted}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left group ${
                    isRestricted
                      ? 'opacity-40 cursor-not-allowed pointer-events-none bg-gray-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className={`text-sm font-medium ${isRestricted ? 'text-gray-400' : 'text-gray-700 group-hover:text-gray-900'}`}>
                    {option.label}
                  </span>
                  {isRestricted ? (
                    <Lock className="w-3.5 h-3.5 text-gray-300" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  )}
                </button>
                {isRestricted && (
                  <div className="pointer-events-auto absolute inset-0" title="Access restricted for Practitioner role." />
                )}
                {isRestricted && (
                  <div className="invisible group-hover/option:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-30 pointer-events-none">
                    Access restricted for Practitioner role.
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};