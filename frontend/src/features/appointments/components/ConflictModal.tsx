import React from 'react';
import { AlertTriangle, Calendar, Clock, User } from 'lucide-react';
import type { Appointment } from '@/types';

// Helper to format time in 12-hour format
const formatTime12Hour = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

interface ConflictingAppointment {
  appointment: Appointment;
  blockStartTime: string;
  blockEndTime: string;
}

interface ConflictModalProps {
  isOpen: boolean;
  conflictingAppointment: ConflictingAppointment | null;
  onBlockExisting: () => void;
  onRescheduleExisting: () => void;
  onCancel: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  conflictingAppointment,
  onBlockExisting,
  onRescheduleExisting,
  onCancel,
}) => {
  if (!isOpen || !conflictingAppointment) return null;

  // Helper to calculate the overlapping time range
  const calculateOverlap = (
    blockStart: string,
    blockEnd: string,
    appointmentStart: string,
    appointmentEnd: string
  ): { overlapStart: string; overlapEnd: string } | null => {
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const blockStartMins = timeToMinutes(blockStart);
    const blockEndMins = timeToMinutes(blockEnd);
    const aptStartMins = timeToMinutes(appointmentStart);
    const aptEndMins = timeToMinutes(appointmentEnd);

    const overlapStartMins = Math.max(blockStartMins, aptStartMins);
    const overlapEndMins = Math.min(blockEndMins, aptEndMins);

    if (overlapStartMins >= overlapEndMins) return null;

    const overlapStart = `${String(Math.floor(overlapStartMins / 60)).padStart(2, '0')}:${String(overlapStartMins % 60).padStart(2, '0')}`;
    const overlapEnd = `${String(Math.floor(overlapEndMins / 60)).padStart(2, '0')}:${String(overlapEndMins % 60).padStart(2, '0')}`;

    return { overlapStart, overlapEnd };
  };

  const { appointment, blockStartTime, blockEndTime } = conflictingAppointment;
  const blockTimeRange = `${formatTime12Hour(blockStartTime)} – ${formatTime12Hour(blockEndTime)}`;
  const appointmentTimeRange = `${formatTime12Hour(appointment.start_time)} – ${formatTime12Hour(appointment.end_time)}`;

  // Calculate the actual overlap time range
  const overlap = calculateOverlap(
    blockStartTime,
    blockEndTime,
    appointment.start_time,
    appointment.end_time
  );
  const conflictTimeRange = overlap
    ? `${formatTime12Hour(overlap.overlapStart)} – ${formatTime12Hour(overlap.overlapEnd)}`
    : blockTimeRange;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-amber-50">
          <div className="flex-shrink-0 p-2 bg-amber-100 rounded-full">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Schedule Conflict</h2>
            <p className="text-sm text-gray-600">This will block an existing appointment</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Conflict Description */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              The block appointment will be blocking the existing appointment and has conflict of{' '}
              <span className="font-semibold text-gray-900">{conflictTimeRange}</span>.
            </p>
          </div>

          {/* Conflicting Appointment Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Conflicting Appointment
            </h3>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <User className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{appointment.patient_name}</p>
                <p className="text-xs text-gray-500">
                  {appointment.service_name || appointment.appointment_type}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <Calendar className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{appointment.date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{appointmentTimeRange}</p>
              </div>
            </div>
          </div>

          {/* Instructions for Reschedule */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
            <p className="text-xs text-sky-700">
              <span className="font-semibold">Note:</span> If you choose to reschedule the existing appointment, 
              you will need to drag it to a new time before creating the block event.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-2">
          <button
            onClick={onBlockExisting}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors"
          >
            Block Existing Appointment
          </button>
          <button
            onClick={onRescheduleExisting}
            className="w-full px-4 py-2.5 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
          >
            Reschedule Existing Appointment
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};