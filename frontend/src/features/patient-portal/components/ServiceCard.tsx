import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { PortalService } from '@/types/portal';

interface ServiceCardProps {
  service:        PortalService;
  isSelected:     boolean;
  onBook:         () => void;
  hideBookButton?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  isSelected,
  onBook,
  hideBookButton = false,
}) => {
  const priceNum = parseFloat(service.price);
  const priceStr = `₱ ${priceNum.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  return (
    <div className="bg-white rounded-xl p-4 flex items-start gap-4">
      {/* Thumbnail */}
      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
            ✕
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{service.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {service.description || service.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{service.duration_minutes} min</p>
      </div>

      {/* Price + Book */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <p className="font-semibold text-gray-800 text-sm">{priceStr}</p>
        {!hideBookButton && (
          <button
            onClick={onBook}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
          >
            Book now
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  );
};