import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDays, Clock, Building2, User,
  CheckCircle2, AlertTriangle, Loader2, XCircle
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

type PageState = 'loading' | 'confirming' | 'cancelling' | 'success' | 'expired' | 'used' | 'error' | 'already_confirmed' | 'already_cancelled' | 'already_rescheduled';

interface CancelResponse {
  detail: string;
  appointment_id: number;
  appointment_date: string;
  appointment_time: string;
  clinic_name: string;
  patient_name: string;
}

interface ErrorData {
  code?: string;
  detail?: string;
  new_date?: string;
  new_time?: string;
  clinic_email?: string;
  clinic_phone?: string;
}

export function AppointmentCancelPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [data, setData] = useState<CancelResponse | null>(null);
  const [errorData, setErrorData] = useState<ErrorData | null>(null);

  useEffect(() => {
    if (!token) { setPageState('error'); return; }

    const controller = new AbortController();

    // Fetch appointment details first
    axios
      .get(`${API_BASE_URL}/appointments/cancel-email/${token}/`, { signal: controller.signal })
      .then(res => {
        setData(res.data as CancelResponse);
        setPageState('confirming');
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        if (axios.isAxiosError(err) && err.response?.status === 410) {
          const resData = err.response.data as ErrorData;
          setErrorData(resData);
          const code = resData.code;
          if (code === 'already_confirmed') setPageState('already_confirmed');
          else if (code === 'already_cancelled') setPageState('already_cancelled');
          else if (code === 'already_rescheduled') setPageState('already_rescheduled');
          else setPageState(code === 'used' ? 'used' : 'expired');
        } else {
          setPageState('error');
        }
      });

    return () => controller.abort();
  }, [token]);

  const handleCancel = () => {
    if (!token) return;
    setPageState('cancelling');
    axios
      .post(`${API_BASE_URL}/appointments/cancel-email/${token}/`)
      .then(res => {
        setData(res.data as CancelResponse);
        setPageState('success');
      })
      .catch(err => {
        if (axios.isAxiosError(err) && err.response?.status === 410) {
          const resData = err.response.data as ErrorData;
          setErrorData(resData);
          const code = resData.code;
          if (code === 'already_confirmed') setPageState('already_confirmed');
          else if (code === 'already_cancelled') setPageState('already_cancelled');
          else if (code === 'already_rescheduled') setPageState('already_rescheduled');
          else setPageState(code === 'used' ? 'used' : 'expired');
        } else {
          setPageState('error');
        }
      });
  };

  // ── Loading / Cancelling ───────────────────────────────────────────────────
  if (pageState === 'loading' || pageState === 'cancelling') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {pageState === 'cancelling' ? 'Cancelling your appointment…' : 'Loading details…'}
          </p>
        </div>
      </div>
    );
  }

  // ── Terminal states: expired / used / error / already_confirmed / already_cancelled / already_rescheduled ────────────
  if (pageState === 'expired' || pageState === 'used' || pageState === 'error' || pageState === 'already_confirmed' || pageState === 'already_cancelled' || pageState === 'already_rescheduled') {
    const configs = {
      expired: {
        icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
        title: 'Link Expired',
        message: 'This cancellation link has expired (links are valid for 48 hours). Please contact the clinic if you still need to cancel your appointment.',
      },
      used: {
        icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
        title: 'Already Cancelled',
        message: 'Your appointment has already been cancelled.',
      },
      error: {
        icon: <AlertTriangle className="w-12 h-12 text-red-500" />,
        title: 'Invalid Link',
        message: 'This cancellation link is invalid or could not be found. Please contact the clinic.',
      },
      already_confirmed: {
        icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
        title: 'Appointment Already Confirmed',
        message: 'You have already confirmed this appointment. You cannot cancel it online. Please contact the clinic directly for assistance.',
      },
      already_cancelled: {
        icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
        title: 'Already Cancelled',
        message: 'Your appointment was already cancelled. Please contact the clinic for further assistance.',
      },
      already_rescheduled: {
        icon: <AlertTriangle className="w-12 h-12 text-blue-500" />,
        title: 'Appointment Rescheduled',
        message: `This appointment has already been rescheduled${errorData?.new_date ? ` to ${errorData.new_date} at ${errorData.new_time}` : ''}. Please check your email for the updated details or contact the clinic.`,
      },
    };
    const cfg = configs[pageState as keyof typeof configs];
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">{cfg.icon}</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{cfg.title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">{cfg.message}</p>

          {(errorData?.clinic_email || errorData?.clinic_phone) && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-600 space-y-2 mt-4 text-left">
              <h3 className="font-medium text-gray-900 mb-2 border-b pb-2">Clinic Contact Info</h3>
              {errorData.clinic_email && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Email:</span>
                  <a href={`mailto:${errorData.clinic_email}`} className="text-indigo-600 hover:text-indigo-700">{errorData.clinic_email}</a>
                </div>
              )}
              {errorData.clinic_phone && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Phone:</span>
                  <a href={`tel:${errorData.clinic_phone}`} className="text-indigo-600 hover:text-indigo-700">{errorData.clinic_phone}</a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Confirming ─────────────────────────────────────────────────────────────
  if (pageState === 'confirming') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden max-w-md w-full">
          <div className="bg-amber-50 px-8 py-8 text-center border-b border-amber-100">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-amber-900 mb-2">Cancel Appointment?</h1>
            <p className="text-amber-700 text-sm">
              Are you sure you want to cancel your appointment?
            </p>
          </div>

          <div className="p-8">
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
              Appointment Details
            </p>

            <div className="space-y-4">
              <div className="flex items-start">
                <User className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Patient</p>
                  <p className="text-sm text-gray-600">{data?.patient_name}</p>
                </div>
              </div>

              <div className="flex items-start">
                <CalendarDays className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Date</p>
                  <p className="text-sm text-gray-600">{data?.appointment_date}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Time</p>
                  <p className="text-sm text-gray-600">{data?.appointment_time}</p>
                </div>
              </div>

              {data?.clinic_name && (
                <div className="flex items-start">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Clinic</p>
                    <p className="text-sm text-gray-600">{data.clinic_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={handleCancel}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-md overflow-hidden max-w-md w-full">
        <div className="bg-red-50 px-8 py-8 text-center border-b border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Appointment Cancelled</h1>
          <p className="text-red-700 text-sm">
            Your appointment has been successfully cancelled.
          </p>
        </div>

        <div className="p-8">
          <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
            Cancellation Details
          </p>

          <div className="space-y-4">
            <div className="flex items-start">
              <User className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Patient</p>
                <p className="text-sm text-gray-600">{data?.patient_name}</p>
              </div>
            </div>

            <div className="flex items-start">
              <CalendarDays className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Date</p>
                <p className="text-sm text-gray-600">{data?.appointment_date}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Time</p>
                <p className="text-sm text-gray-600">{data?.appointment_time}</p>
              </div>
            </div>

            {data?.clinic_name && (
              <div className="flex items-start">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Clinic</p>
                  <p className="text-sm text-gray-600">{data.clinic_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            You can safely close this window.
          </p>
        </div>
      </div>
    </div>
  );
}
