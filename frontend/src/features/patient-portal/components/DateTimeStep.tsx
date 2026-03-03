import React from 'react';
import { ServiceCard } from './ServiceCard';
import type { PortalService } from '@/types/portal';

interface DateTimeStepProps {
  selectedService: PortalService;
  selectedDate:    string;
  selectedSlot:    string;
  availableSlots:  string[];
  slotsLoading:    boolean;
  todayStr:        string;
  onDateChange:    (date: string) => void;
  onSlotChange:    (slot: string) => void;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  selectedService,
  selectedDate,
  selectedSlot,
  availableSlots,
  slotsLoading,
  todayStr,
  onDateChange,
  onSlotChange,
}) => {
  return (
    <div className="space-y-3">
      {/* Selected service recap */}
      <div className="bg-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 font-semibold text-gray-800">
          {selectedService.category_name ?? 'Service'}
        </div>
        <div className="px-3 pb-3">
          <ServiceCard
            service={selectedService}
            isSelected
            onBook={() => {}}
            hideBookButton
          />
        </div>
      </div>

      {/* Date + time picker */}
      <div className="bg-gray-200 rounded-xl p-5">
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          Select Date
        </label>
        <input
          type="date"
          min={todayStr}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />

        {selectedDate && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">
              Available Times
            </p>

            {slotsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No available slots for this date.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => onSlotChange(slot)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSlot === slot
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};