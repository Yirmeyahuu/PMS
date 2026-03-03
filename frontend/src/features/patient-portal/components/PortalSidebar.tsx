import React from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';
import type { PortalData, PortalService } from '@/types/portal';

interface PortalSidebarProps {
  portal:          PortalData;
  selectedService: PortalService | null;
  selectedDate:    string;
  selectedSlot:    string;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  portal,
  selectedService,
  selectedDate,
  selectedSlot,
}) => {
  return (
    <aside className="w-64 flex-shrink-0 p-4 flex flex-col gap-3">

      {/* Logo */}
      <div className="bg-white rounded-xl p-6 flex items-center justify-center h-28 shadow-sm">
        {portal.clinic_logo ? (
          <img
            src={portal.clinic_logo}
            alt={portal.clinic_name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-lg font-bold text-gray-600 text-center">
            {portal.clinic_name}
          </span>
        )}
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
          <span>{portal.clinic_address || portal.clinic_name}</span>
        </div>
      </div>

      {/* Selected practitioner / service card */}
      {selectedService && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-2xl text-gray-400">👤</span>
          </div>
          <p className="text-sm font-medium text-gray-700 text-center">
            Any Practitioner
          </p>
          <p className="text-xs text-gray-400">
            {selectedService.category_name ?? 'General'}
          </p>
        </div>
      )}

      {/* Appointment Details summary */}
      {selectedService && selectedDate && selectedSlot && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Appointment Details
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', {
                month: 'long',
                day:   'numeric',
                year:  'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{selectedSlot}</span>
          </div>
        </div>
      )}
    </aside>
  );
};