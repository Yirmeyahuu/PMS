import React from 'react';
import { X, Calendar, Clock, Timer } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: {
    date: Date;
    time: string;
    hour: number;
    minutes: number;
    duration: number; // Duration in minutes
  } | null;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedSlot,
}) => {
  if (!isOpen || !selectedSlot) return null;

  // Format the selected date and time
  const formattedDate = format(selectedSlot.date, 'EEEE, MMMM d, yyyy');
  const formattedTime = `${selectedSlot.hour > 12 ? selectedSlot.hour - 12 : selectedSlot.hour}:${selectedSlot.minutes.toString().padStart(2, '0')} ${selectedSlot.hour >= 12 ? 'PM' : 'AM'}`;

  // Calculate end time
  const endMinutes = selectedSlot.hour * 60 + selectedSlot.minutes + selectedSlot.duration;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const formattedEndTime = `${endHour > 12 ? endHour - 12 : endHour}:${endMin.toString().padStart(2, '0')} ${endHour >= 12 ? 'PM' : 'AM'}`;

  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto transform transition-all duration-300 scale-100 opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Appointment</h2>
                <p className="text-sm text-gray-600">Schedule a new appointment</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Selected Time Display */}
            <div className="bg-sky-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div className="flex items-center gap-2 text-sky-700">
                  <Calendar className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{formattedDate}</span>
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-2 text-sky-700">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">
                    {formattedTime} - {formattedEndTime}
                  </span>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 text-sky-700">
                  <Timer className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">
                    {formatDuration(selectedSlot.duration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Placeholder Content */}
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-sky-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                This is the Appointment Modal
              </h3>
              <p className="text-gray-600 mb-4">
                Appointment form will be implemented here
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-lg text-sm text-sky-700">
                <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                Session Duration: {formatDuration(selectedSlot.duration)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              disabled
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Appointment
            </button>
          </div>
        </div>
      </div>
    </>
  );
};