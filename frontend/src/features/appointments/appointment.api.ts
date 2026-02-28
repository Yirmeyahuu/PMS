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
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

/**
 * Get all appointments with filters
 */
export const getAppointments = async (
  filters?: AppointmentFilters
): Promise<PaginatedResponse<Appointment>> => {
  const params = new URLSearchParams();

  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.appointment_type) params.append('appointment_type', filters.appointment_type);
  if (filters?.patient) params.append('patient', String(filters.patient));
  if (filters?.practitioner) params.append('practitioner', String(filters.practitioner));
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.page_size) params.append('page_size', String(filters.page_size));

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