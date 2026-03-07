import React, { useState } from 'react';
import { X, CheckCircle, XCircle, User, Calendar, Clock, Stethoscope, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updatePortalBookingStatus } from '../appointment.api';
import type { PortalBookingDiaryItem } from '../appointment.api';
import toast from 'react-hot-toast';

interface AppointmentConfirmationModalProps {
  isOpen:    boolean;
  booking:   PortalBookingDiaryItem | null;
  onClose:   () => void;
  onUpdated: () => void;
  onRemove:  (bookingId: number) => void;
}

export const AppointmentConfirmationModal: React.FC<AppointmentConfirmationModalProps> = ({
  isOpen,
  booking,
  onClose,
  onUpdated,
  onRemove,
}) => {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);

  // After confirm — store the created patient info to show a link
  const [createdPatient, setCreatedPatient] = useState<{
    id: number;
    name: string;
    number: string;
  } | null>(null);

  if (!isOpen || !booking) return null;

  const isPending    = booking.status === 'PENDING';
  const isConfirmed  = booking.status === 'CONFIRMED';

  const handleConfirm = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const result = await updatePortalBookingStatus(booking.id, 'CONFIRMED');

      // ✅ Immediately remove orange block from calendar
      onRemove(booking.id);
      onClose();

      if (result.warning) {
        toast.error(result.warning);
      } else if (result.patient_name && result.patient_number) {
        toast.success(
          `Booking confirmed! ${result.patient_name} (${result.patient_number}) added to Clients list.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Booking confirmed!');
      }

      // Refetch in background to load the new green Appointment block
      setTimeout(() => onUpdated(), 300);

    } catch (err: any) {
      console.error('Confirm booking error:', err.response?.data || err.message || err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.status ||
        JSON.stringify(err.response?.data) ||
        'Failed to confirm booking';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      await updatePortalBookingStatus(booking.id, 'CANCELLED');
      onRemove(booking.id);
      onClose();
      toast.success('Booking cancelled');
      setTimeout(() => onUpdated(), 300);
    } catch (err: any) {
      console.error('Cancel booking error:', err.response?.data || err.message || err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.status ||
        JSON.stringify(err.response?.data) ||
        'Failed to cancel booking';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToClient = () => {
    if (createdPatient) {
      onClose();
      navigate(`/clients/${createdPatient.id}`);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${
            isPending ? 'bg-orange-50' : isConfirmed ? 'bg-sky-50' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isPending ? 'bg-orange-100' : isConfirmed ? 'bg-sky-100' : 'bg-gray-100'
              }`}>
                <Calendar className={`w-4 h-4 ${
                  isPending ? 'text-orange-600' : isConfirmed ? 'text-sky-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Portal Booking</h2>
                <p className="text-xs text-gray-500">#{booking.reference_number}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-5 space-y-4">

            {/* Status badge */}
            <div className="flex justify-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isPending
                  ? 'bg-orange-100 text-orange-700'
                  : isConfirmed
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                {isPending ? 'Pending Review' : isConfirmed ? 'Confirmed' : 'Cancelled'}
              </span>
            </div>

            {/* Booking details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Patient</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.patient_name}</p>
                  {booking.patient_phone && (
                    <p className="text-xs text-gray-500">{booking.patient_phone}</p>
                  )}
                  {booking.patient_email && (
                    <p className="text-xs text-gray-500">{booking.patient_email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.service_name || '—'}</p>
                  {booking.practitioner_name && (
                    <p className="text-xs text-gray-500">with {booking.practitioner_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Date & Time</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(booking.date).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {booking.start_time} – {booking.end_time} ({booking.duration_minutes} min)
                  </p>
                </div>
              </div>

              {booking.notes && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Notes from patient</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
                </div>
              )}
            </div>

            {/* ── Success: patient was created — show link ── */}
            {createdPatient && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800">
                      Client added to your Client List
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {createdPatient.name} · #{createdPatient.number}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Please update their profile with full details (DOB, address, etc.)
                    </p>
                  </div>
                  <button
                    onClick={handleGoToClient}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </button>
                </div>
              </div>
            )}

            {/* Pending info notice */}
            {isPending && !createdPatient && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Confirming this booking will automatically add the patient to your
                  <strong> Clients list</strong> and create a diary appointment.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {createdPatient ? 'Done' : 'Close'}
            </button>

            {/* Only show action buttons if still actionable */}
            {(isPending || isConfirmed) && !createdPatient && (
              <div className="flex items-center gap-2">
                {/* Cancel */}
                {(isPending || isConfirmed) && (
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Booking
                  </button>
                )}

                {/* Confirm */}
                {isPending && (
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {loading ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};