import React from 'react';
import { X, Calendar, Ban } from 'lucide-react';

interface SelectOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewAppointment: () => void;
  onSelectBlockAppointment: () => void;
}

export const SelectOptionModal: React.FC<SelectOptionModalProps> = ({
  isOpen,
  onClose,
  onSelectNewAppointment,
  onSelectBlockAppointment,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-base font-bold text-gray-900">What would you like to add?</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose an action for the selected time slot</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Options */}
          <div className="p-5 grid gap-3">

            {/* Create New Appointment */}
            <button
              onClick={onSelectNewAppointment}
              className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-sky-400 hover:bg-sky-50 transition-all text-left group"
            >
              <div className="w-11 h-11 bg-sky-100 group-hover:bg-sky-200 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                <Calendar className="w-5 h-5 text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Create New Appointment</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Schedule a patient appointment with a practitioner for the selected time.
                </p>
              </div>
            </button>

            {/* Add Block Appointment */}
            <button
              onClick={onSelectBlockAppointment}
              className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
            >
              <div className="w-11 h-11 bg-amber-100 group-hover:bg-amber-200 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                <Ban className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Add Block Appointment</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Block off time on the calendar for events, breaks, or unavailability.
                  Drag across slots to set the duration.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
