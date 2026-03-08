import axiosInstance from '@/lib/axios';

export interface ReportDateRange {
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
}

// ─── Uninvoiced Bookings ──────────────────────────────────────────────────────

export interface UninvoicedBookingItem {
  appointment_id:       number;
  date:                 string;
  start_time:           string;
  end_time:             string;
  appointment_type:     string;
  status:               string;
  patient_id:           number;
  patient_name:         string;
  patient_number:       string;
  practitioner_name:    string;
  service_name:         string;
  branch_name:          string | null;
  days_since_completed: number | null;
}

export interface UninvoicedBookingsResponse {
  report_type:  string;
  tab:          string;
  start_date:   string;
  end_date:     string;
  total_count:  number;
  results:      UninvoicedBookingItem[];
}

export interface UninvoicedBookingsParams extends ReportDateRange {
  practitioner_id?: number;
  branch_id?:       number;
}

export const getUninvoicedBookings = async (
  params?: UninvoicedBookingsParams
): Promise<UninvoicedBookingsResponse> => {
  const response = await axiosInstance.get('/reports/uninvoiced_bookings/', { params });
  return response.data;
};

// ─── Cancellations ────────────────────────────────────────────────────────────

export interface CancellationItem {
  appointment_id:    number;
  date:              string;
  start_time:        string;
  end_time:          string;
  cancelled_at:      string | null;
  appointment_type:  string;
  status:            string;
  patient_id:        number;
  patient_name:      string;
  patient_number:    string;
  practitioner_name: string;
  service_name:      string;
  branch_name:       string | null;
  cancelled_by:      string | null;
  reason:            string | null;
}

export interface CancellationsResponse {
  report_type:     string;
  tab:             string;
  start_date:      string;
  end_date:        string;
  total_count:     number;
  cancelled_count: number;
  no_show_count:   number;
  results:         CancellationItem[];
}

export interface CancellationsParams extends ReportDateRange {
  include_no_show?:  boolean;
  practitioner_id?:  number;
  branch_id?:        number;
}

export const getCancellations = async (
  params?: CancellationsParams
): Promise<CancellationsResponse> => {
  const response = await axiosInstance.get('/reports/cancellations/', { params });
  return response.data;
};

// ─── Clients & Cases ──────────────────────────────────────────────────────────

export interface UpcomingBooking {
  appointment_id:    number;
  date:              string;
  start_time:        string;
  appointment_type:  string;
  status:            string;
  practitioner_name: string;
  service_name:      string;
}

export interface ClientCaseItem {
  patient_id:         number;
  patient_name:       string;
  patient_number:     string;
  gender:             string;
  date_of_birth:      string | null;
  phone:              string | null;
  email:              string | null;
  registered_on:      string;
  is_new_this_period: boolean;
  total_bookings:     number;
  range_bookings:     number;
  upcoming_bookings:  UpcomingBooking[];
}

export interface ClientCasesResponse {
  report_type:           string;
  tab:                   string;
  start_date:            string;
  end_date:              string;
  total_patients:        number;
  new_clients_count:     number;
  total_range_bookings:  number;
  results:               ClientCaseItem[];
}

export interface ClientCasesParams extends ReportDateRange {
  new_only?: boolean;
}

export const getClientsCases = async (
  params?: ClientCasesParams
): Promise<ClientCasesResponse> => {
  const response = await axiosInstance.get('/reports/clients_cases/', { params });
  return response.data;
};

// ─── Clinical Notes ───────────────────────────────────────────────────────────

export interface ClinicalNotesMissingItem {
  appointment_id:    number;
  date:              string;
  start_time:        string;
  end_time:          string;
  appointment_type:  string;
  status:            string;
  note_status:       'MISSING' | 'UNSIGNED_DRAFT';
  note_id?:          number;
  patient_id:        number;
  patient_name:      string;
  patient_number:    string;
  practitioner_name: string;
  service_name:      string;
  branch_name:       string | null;
  days_since:        number;
}

export interface ClinicalNotesResponse {
  report_type:         string;
  tab:                 string;
  start_date:          string;
  end_date:            string;
  total_count:         number;
  missing_note_count:  number;
  unsigned_note_count: number;
  results:             ClinicalNotesMissingItem[];
}

export interface ClinicalNotesParams extends ReportDateRange {
  practitioner_id?:  number;
  include_unsigned?: boolean;
}

export const getClinicalNotes = async (
  params?: ClinicalNotesParams
): Promise<ClinicalNotesResponse> => {
  const response = await axiosInstance.get('/reports/clinical_notes/', { params });
  return response.data;
};