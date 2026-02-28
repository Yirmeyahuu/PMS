import React from 'react';
import { X, Calendar, Clock, User, FileText, Tag, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment } from '@/types';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_TYPE_LABELS } from '@/types';

interface AppointmentViewProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
}

export const AppointmentView: React.FC<AppointmentViewProps> = ({
  isOpen,
  onClose,
  appointment,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !appointment) return null;

  const statusColors = APPOINTMENT_STATUS_COLORS[appointment.status];
  const typeLabel = APPOINTMENT_TYPE_LABELS[appointment.appointment_type];

  const formattedDate = format(new Date(appointment.date), 'EEEE, MMMM d, yyyy');
  const formattedTime = `${appointment.start_time} - ${appointment.end_time}`;

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Appointment Details</h2>
                <p className="text-xs text-gray-500">{appointment.patient_name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Status + Type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                {appointment.status.replace('_', ' ')}
              </span>
              <span className="text-gray-300 text-sm">·</span>
              <span className="text-sm font-medium text-gray-600">{typeLabel}</span>
            </div>

            {/* Date & Time block */}
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-sky-600 font-medium">Date</p>
                    <p className="text-sm font-semibold text-gray-900">{formattedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-sky-600 font-medium">Time</p>
                    <p className="text-sm font-semibold text-gray-900">{formattedTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-sky-600 font-medium">Duration</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDuration(appointment.duration_minutes)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient & Practitioner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <User className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{appointment.patient_name}</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <User className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Practitioner</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{appointment.practitioner_name}</p>
              </div>
            </div>

            {/* Location */}
            {appointment.location_name && (
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</span>
                </div>
                <p className="text-sm text-gray-900">{appointment.location_name}</p>
              </div>
            )}

            {/* Chief Complaint */}
            {appointment.chief_complaint && (
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chief Complaint</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.chief_complaint}</p>
              </div>
            )}

            {/* Internal Notes */}
            {appointment.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Internal Notes</span>
                  <span className="text-xs text-amber-500">(Staff Only)</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            )}

            {/* Patient Notes */}
            {appointment.patient_notes && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Patient Notes</span>
                  <span className="text-xs text-sky-500">(Visible to Patient)</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.patient_notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
              {[
                { label: 'Created by', value: appointment.created_by_name || 'Unknown' },
                { label: 'Created at', value: format(new Date(appointment.created_at), 'MMM d, yyyy h:mm a') },
                ...(appointment.updated_by_name
                  ? [
                      { label: 'Last updated by', value: appointment.updated_by_name },
                      { label: 'Updated at', value: format(new Date(appointment.updated_at), 'MMM d, yyyy h:mm a') },
                    ]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(appointment)}
                  className="px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                <button
                  onClick={() => onDelete(appointment)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Cancel Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};