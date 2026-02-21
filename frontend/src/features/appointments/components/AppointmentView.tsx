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

  // Format date and time
  const formattedDate = format(new Date(appointment.date), 'EEEE, MMMM d, yyyy');
  const formattedTime = `${appointment.start_time} - ${appointment.end_time}`;
  
  // Calculate duration display
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
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto transform transition-all duration-300 scale-100 opacity-100 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${statusColors.bg} rounded-xl flex items-center justify-center`}>
                <Calendar className={`w-6 h-6 ${statusColors.text}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Appointment Details</h2>
                <p className="text-sm text-gray-600">{appointment.patient_name}</p>
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

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <span className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                ${statusColors.bg} ${statusColors.text} ${statusColors.border} border
              `}>
                {appointment.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-medium text-gray-700">{typeLabel}</span>
            </div>

            {/* Date & Time */}
            <div className="bg-sky-50 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-sky-600 font-medium">Date</div>
                    <div className="text-sm font-semibold text-gray-900">{formattedDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-sky-600 font-medium">Time</div>
                    <div className="text-sm font-semibold text-gray-900">{formattedTime}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-sky-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-sky-600 font-medium">Duration</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatDuration(appointment.duration_minutes)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient & Practitioner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Patient</span>
                </div>
                <p className="text-base font-medium text-gray-900">{appointment.patient_name}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Practitioner</span>
                </div>
                <p className="text-base font-medium text-gray-900">{appointment.practitioner_name}</p>
              </div>
            </div>

            {/* Location */}
            {appointment.location_name && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Location</span>
                </div>
                <p className="text-base text-gray-900">{appointment.location_name}</p>
              </div>
            )}

            {/* Chief Complaint */}
            {appointment.chief_complaint && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Chief Complaint</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.chief_complaint}</p>
              </div>
            )}

            {/* Internal Notes */}
            {appointment.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">Internal Notes</span>
                  <span className="text-xs text-amber-600">(Staff Only)</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            )}

            {/* Patient Notes */}
            {appointment.patient_notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Patient Notes</span>
                  <span className="text-xs text-blue-600">(Visible to Patient)</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.patient_notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created by:</span>
                <span className="font-medium text-gray-900">
                  {appointment.created_by_name || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created at:</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(appointment.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              {appointment.updated_by_name && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last updated by:</span>
                    <span className="font-medium text-gray-900">{appointment.updated_by_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Updated at:</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(appointment.updated_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer - Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(appointment)}
                  className="px-5 py-2.5 text-sky-600 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors font-medium"
                >
                  Edit
                </button>
              )}
              {onDelete && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                <button
                  onClick={() => onDelete(appointment)}
                  className="px-5 py-2.5 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
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