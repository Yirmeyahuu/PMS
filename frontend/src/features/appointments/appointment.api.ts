import axiosInstance from '@/lib/axios';
import type {
  Appointment,
  CreateAppointmentData,
  PaginatedResponse,
} from '@/types';

export interface AppointmentFilters {
  search?: string;
  status?: string;
  appointment_type?: string;
  patient?: number;
  practitioner?: number;
  clinic_branch?: number;
  date_from?: string;
  date_to?: string;
  // Backend also accepts start_date/end_date (used by diary)
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface PortalBookingDiaryItem {
  id:               number;
  reference_number: string;
  status:           'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  patient_name:     string;
  patient_phone:    string;
  patient_email:    string;
  service_name:     string;
  practitioner_name: string | null;
  date:             string;   // yyyy-MM-dd
  start_time:       string;   // HH:MM
  end_time:         string;   // HH:MM
  duration_minutes: number;
  notes:            string;
}

/**
 * Get all appointments with filters
 */
export const getAppointments = async (
  filters?: AppointmentFilters
): Promise<PaginatedResponse<Appointment>> => {
  const params = new URLSearchParams();

  if (filters?.search)            params.append('search',           filters.search);
  if (filters?.status)            params.append('status',           filters.status);
  if (filters?.appointment_type)  params.append('appointment_type', filters.appointment_type);
  if (filters?.patient)           params.append('patient',          String(filters.patient));
  if (filters?.practitioner)      params.append('practitioner',     String(filters.practitioner));
  if (filters?.clinic_branch)     params.append('clinic_branch',    String(filters.clinic_branch));
  if (filters?.date_from)         params.append('date_from',        filters.date_from);
  if (filters?.date_to)           params.append('date_to',          filters.date_to);
  // Diary uses start_date/end_date — backend get_queryset reads these
  if (filters?.start_date)        params.append('start_date',       filters.start_date);
  if (filters?.end_date)          params.append('end_date',         filters.end_date);
  if (filters?.page)              params.append('page',             String(filters.page));
  if (filters?.page_size)         params.append('page_size',        String(filters.page_size));

  const response = await axiosInstance.get<PaginatedResponse<Appointment>>(
    `/appointments/?${params.toString()}`
  );
  return response.data;
};

/**
 * Get single appointment by ID
 */
export const getAppointment = async (id: number): Promise<Appointment> => {
  const response = await axiosInstance.get<Appointment>(`/appointments/${id}/`);
  return response.data;
};

/**
 * Create new appointment
 */
export const createAppointment = async (
  data: CreateAppointmentData
): Promise<Appointment> => {
  const response = await axiosInstance.post<Appointment>('/appointments/', data);
  return response.data;
};

/**
 * Update appointment
 */
export const updateAppointment = async (
  id: number,
  data: Partial<CreateAppointmentData>
): Promise<Appointment> => {
  const response = await axiosInstance.patch<Appointment>(`/appointments/${id}/`, data);
  return response.data;
};

/**
 * Delete appointment
 */
export const deleteAppointment = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/appointments/${id}/`);
};

/**
 * Get clinical notes for an appointment
 */
export const getAppointmentClinicalNotes = async (appointmentId: number) => {
  const response = await axiosInstance.get(
    `/clinical-notes/?appointment=${appointmentId}`
  );
  return response.data;
};

/**
 * Get invoice for an appointment
 */
export const getAppointmentInvoice = async (appointmentId: number) => {
  const response = await axiosInstance.get(
    `/invoices/?appointment=${appointmentId}`
  );
  return response.data;
};

export const getPortalBookingsForDiary = async (params: {
  start_date:     string;
  end_date:       string;
  practitioner?:  number;
  clinic_branch?: number;
}): Promise<PortalBookingDiaryItem[]> => {
  const response = await axiosInstance.get<PortalBookingDiaryItem[]>(
    `/appointments/portal_bookings/`,
    { params }
  );
  return response.data;
};

/**
 * Update portal booking status (CONFIRMED / CANCELLED)
 */
export const updatePortalBookingStatus = async (
  id: number,
  newStatus: 'CONFIRMED' | 'CANCELLED'
): Promise<{
  id: number;
  status: string;
  patient_id?: number;
  patient_number?: string;
  patient_name?: string;
  appointment_id?: number;
  warning?: string;
}> => {
  const response = await axiosInstance.patch(
    `/portal-bookings/${id}/update_status/`,
    { status: newStatus }
  );
  return response.data;
};