export interface Appointment {
  id: number;
  clinic: number;
  patient: number;
  patient_name: string;
  practitioner: number | null;  // ✅ CHANGED: Allow null
  practitioner_name: string | null;  // ✅ CHANGED: Allow null
  location: number | null;
  location_name: string | null;
  appointment_type: 'INITIAL' | 'FOLLOW_UP' | 'THERAPY' | 'ASSESSMENT';
  status: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  chief_complaint: string;
  notes: string;
  patient_notes: string;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  
  created_by: number | null;
  created_by_name: string | null;
  updated_by: number | null;
  updated_by_name: string | null;
  
  cancelled_by: number | null;
  cancellation_reason: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentData {
  clinic: number;
  patient: number;
  practitioner?: number | null;  // ✅ CHANGED: Make optional and nullable
  location?: number | null;
  appointment_type: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  chief_complaint?: string;
  notes?: string;
  patient_notes?: string;
}

export interface PractitionerSchedule {
  id: number;
  practitioner: number;
  practitioner_name: string;
  location: number;
  location_name: string;
  weekday: number;
  weekday_display: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentReminder {
  id: number;
  appointment: number;
  reminder_type: 'EMAIL' | 'SMS' | 'BOTH';
  sent_at: string;
  is_successful: boolean;
  error_message: string;
}

// Appointment status badge colors
export const APPOINTMENT_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SCHEDULED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CONFIRMED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  CHECKED_IN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  IN_PROGRESS: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  COMPLETED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  NO_SHOW: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

// Appointment type display names
export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Initial Consultation',
  FOLLOW_UP: 'Follow-up',
  THERAPY: 'Therapy Session',
  ASSESSMENT: 'Assessment',
}; 