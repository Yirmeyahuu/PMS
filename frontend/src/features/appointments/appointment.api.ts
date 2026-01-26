export interface Appointment {
  id: number;
  clinic: number;
  patient: number;
  patient_name: string;
  practitioner: number;
  practitioner_name: string;
  location: number | null;
  location_name: string;
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
  cancelled_by: number | null;
  cancellation_reason: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
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
}

export interface CreateAppointmentData {
  clinic: number;
  patient: number;
  practitioner: number;
  location?: number;
  appointment_type: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  chief_complaint?: string;
  notes?: string;
  patient_notes?: string;
}