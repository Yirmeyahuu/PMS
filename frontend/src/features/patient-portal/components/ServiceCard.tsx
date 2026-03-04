import React, { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import type { PortalService, PortalPractitioner } from '@/types/portal';
import { PortalAvailabilityCalendar } from './PortalAvailabilityCalendar';

interface ServiceCardProps {
  service:             PortalService;
  isSelected:          boolean;
  onBook:              () => void;
  hideBookButton?:     boolean;
  // ── new props for inline calendar ──
  token?:              string;
  practitioner?:       PortalPractitioner | null;
  onDateTimeConfirm?:  (date: string, slot: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  isSelected,
  onBook,
  hideBookButton = false,
  token,
  practitioner,
  onDateTimeConfirm,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const priceNum = parseFloat(service.price);
  const priceStr = `₱ ${priceNum.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  const handleBookClick = () => {
    if (token && onDateTimeConfirm) {
      onBook(); // mark as selected
      setShowCalendar(true);
    } else {
      onBook();
    }
  };

  const handleConfirm = (date: string, slot: string) => {
    setShowCalendar(false);
    onDateTimeConfirm?.(date, slot);
  };

  return (
    <>
      <div
        className={`flex items-center gap-4 px-4 py-3 transition-colors ${
          isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'
        }`}
      >
        {/* Thumbnail */}
        <div
          className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: service.image_url ? undefined : (service.color_hex ?? '#0D9488') + '33' }}
        >
          {service.image_url ? (
            <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg font-bold"
              style={{ color: service.color_hex ?? '#0D9488' }}
            >
              {service.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
            {service.name}
          </p>
          {service.description && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{service.description}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">{service.duration_minutes} min</span>
          </div>
        </div>

        {/* Price + Book */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="font-bold text-gray-800 text-sm">{priceStr}</p>
          {!hideBookButton && (
            <button
              onClick={handleBookClick}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isSelected
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {isSelected ? 'Selected ✓' : 'Book now'}
              {!isSelected && <ChevronRight className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Inline calendar dropdown */}
      {showCalendar && token && (
        <div className="px-4 pb-4 bg-teal-50/50 border-t border-teal-100">
          <PortalAvailabilityCalendar
            token={token}
            service={service}
            practitioner={practitioner ?? null}
            onConfirm={handleConfirm}
            onClose={() => setShowCalendar(false)}
          />
        </div>
      )}
    </>
  );
};