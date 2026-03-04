import React, { useState } from 'react';
import {
  X, User, Phone, Mail, Calendar, Clock,
  Stethoscope, FileText, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import { updatePortalBookingStatus } from '../appointment.api';
import type { PortalBookingDiaryItem } from '../appointment.api';
import toast from 'react-hot-toast';

interface AppointmentConfirmationModalProps {
  isOpen:    boolean;
  booking:   PortalBookingDiaryItem | null;
  onClose:   () => void;
  onUpdated: () => void;
}

export const AppointmentConfirmationModal: React.FC<AppointmentConfirmationModalProps> = ({
  isOpen,
  booking,
  onClose,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !booking) return null;

  const isPending   = booking.status === 'PENDING';
  const isConfirmed = booking.status === 'CONFIRMED';

  const handleAction = async (newStatus: 'CONFIRMED' | 'CANCELLED') => {
    setLoading(true);
    try {
      await updatePortalBookingStatus(booking.id, newStatus);
      toast.success(
        newStatus === 'CONFIRMED'
          ? 'Booking confirmed successfully!'
          : 'Booking has been declined.'
      );
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update booking status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-200">

          {/* Header */}
          <div className={`flex items-center justify-between p-5 border-b rounded-t-2xl ${
            isPending   ? 'bg-orange-50 border-orange-100' :
            isConfirmed ? 'bg-sky-50 border-sky-100'       :
                          'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                isPending   ? 'bg-orange-100' :
                isConfirmed ? 'bg-sky-100'    :
                              'bg-gray-100'
              }`}>
                {isPending   && <AlertCircle className="w-5 h-5 text-orange-600" />}
                {isConfirmed && <CheckCircle  className="w-5 h-5 text-sky-600"    />}
                {!isPending && !isConfirmed && <XCircle className="w-5 h-5 text-gray-500" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Portal Booking
                </h2>
                <p className="text-xs text-gray-500 font-mono">
                  #{booking.reference_number}
                </p>
              </div>
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                isPending   ? 'bg-orange-100 text-orange-700 border-orange-200' :
                isConfirmed ? 'bg-sky-100 text-sky-700 border-sky-200'         :
                              'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {isPending && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                )}
                {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">

            {/* Patient Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800">
                    {booking.patient_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{booking.patient_phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{booking.patient_email}</span>
                </div>
              </div>
            </div>

            {/* Appointment Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Appointment Details
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {booking.start_time} – {booking.end_time}
                      <span className="text-xs text-gray-400 font-normal ml-1">
                        ({booking.duration_minutes} min)
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 col-span-2">
                  <Stethoscope className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Service</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {booking.service_name}
                    </p>
                  </div>
                </div>
                {booking.practitioner_name && (
                  <div className="flex items-center gap-3 col-span-2">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Practitioner</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {booking.practitioner_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Patient Notes
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Close
            </button>

            {/* Only show action buttons when PENDING */}
            {isPending && (
              <>
                <button
                  onClick={() => handleAction('CANCELLED')}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Decline'}
                </button>
                <button
                  onClick={() => handleAction('CONFIRMED')}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </>
            )}

            {/* Already confirmed — show decline only */}
            {isConfirmed && (
              <button
                onClick={() => handleAction('CANCELLED')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {loading ? 'Processing...' : 'Cancel Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};