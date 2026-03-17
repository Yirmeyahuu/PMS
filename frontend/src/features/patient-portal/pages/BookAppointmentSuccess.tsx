import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, User, Stethoscope, MapPin } from 'lucide-react';
import type { BookingConfirmation } from '@/types/portal';

const fmt12 = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const BookAppointmentSuccess: React.FC = () => {
  const { token }    = useParams<{ token: string }>();
  const { state }    = useLocation();
  const confirmation = state?.confirmation as BookingConfirmation | undefined;

  if (!confirmation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500">No booking information found.</p>
          <Link to={`/portal/${token}`} className="mt-4 inline-block text-teal-600 underline text-sm">
            Go back to booking portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-teal-600 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Booking Confirmed!</h1>
          <p className="text-teal-100 text-sm mt-1">
            Your appointment has been successfully booked.
          </p>
        </div>

        {/* Reference number */}
        <div className="bg-teal-50 border-b border-teal-100 px-6 py-3 text-center">
          <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Reference Number</p>
          <p className="text-lg font-bold text-teal-800 font-mono">#{confirmation.reference_number}</p>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-4">

          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Patient</p>
              <p className="text-sm font-semibold text-gray-900">
                {confirmation.patient_first_name} {confirmation.patient_last_name}
              </p>
              <p className="text-xs text-gray-500">{confirmation.patient_email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Service</p>
              <p className="text-sm font-semibold text-gray-900">{confirmation.service_name}</p>
              <p className="text-xs text-gray-500">{confirmation.service_duration} minutes</p>
              {confirmation.practitioner_name && (
                <p className="text-xs text-gray-500">with {confirmation.practitioner_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Date & Time</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(confirmation.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
              <p className="text-xs text-gray-500">{fmt12(confirmation.appointment_time)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Clinic</p>
              <p className="text-sm font-semibold text-gray-900">{confirmation.clinic_name}</p>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="mx-6 mb-5 bg-teal-50 border border-teal-200 rounded-xl p-3">
          <p className="text-xs text-teal-700 text-center">
            A confirmation has been recorded. Please arrive a few minutes early for your appointment.
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <Link
            to={`/portal/${token}`}
            className="block w-full text-center py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Book Another Appointment
          </Link>
        </div>
      </div>
    </div>
  );
};