import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle, Calendar, Clock, User,
  Stethoscope, Phone, Mail,
} from 'lucide-react';
import type { BookingConfirmation } from '@/types/portal';

export const BookAppointmentSuccess: React.FC = () => {
  const { token }    = useParams<{ token: string }>();
  const location     = useLocation();
  const navigate     = useNavigate();
  const confirmation = location.state?.confirmation as BookingConfirmation | undefined;

  if (!confirmation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-gray-600 mb-4">No booking information found.</p>
          <button
            onClick={() => navigate(`/portal/${token}`)}
            className="px-6 py-2 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700"
          >
            Go back to booking
          </button>
        </div>
      </div>
    );
  }

  const apptDate = new Date(
    confirmation.appointment_date + 'T00:00:00',
  ).toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const apptTime = (() => {
    const [h, m] = confirmation.appointment_time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
  })();

  const priceStr = `₱ ${parseFloat(confirmation.service_price).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
  })}`;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-gray-200 rounded-2xl p-8 max-w-lg w-full shadow-lg">

        {/* Practitioner card */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-2 w-48 shadow-sm">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-800 text-center">
              {confirmation.practitioner_name ?? confirmation.clinic_name}
            </p>
            <p className="text-xs text-gray-400 text-center">
              {confirmation.practitioner_specialization ?? confirmation.service_name}
            </p>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-7 h-7 text-teal-500" />
            <h1 className="text-2xl font-bold text-gray-800">You are booked!</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Your appointment has been received and is pending confirmation.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Reference:{' '}
            <span className="font-mono font-semibold">
              {confirmation.reference_number}
            </span>
          </p>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-xl p-5 space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Appointment Details
          </h2>

          <div className="flex items-start gap-3">
            <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {confirmation.service_name}
              </p>
              <p className="text-xs text-gray-400">
                {confirmation.service_duration} min · {priceStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">{apptDate}</p>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">{apptTime}</p>
          </div>

          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              {confirmation.patient_first_name} {confirmation.patient_last_name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">{confirmation.patient_email}</p>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">{confirmation.patient_phone}</p>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/portal/${token}`)}
            className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-400 transition-colors text-sm"
          >
            Book Another
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors text-sm"
          >
            Print / Save
          </button>
        </div>
      </div>
    </div>
  );
};