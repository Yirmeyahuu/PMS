import axiosInstance from '@/lib/axios';
import type { Appointment, CreateAppointmentData, PractitionerSchedule } from '@/types';

// ✅ KEEP: API-specific interface (not a general type)
export interface AppointmentFilters {
  start_date?: string;
  end_date?: string;
  patient?: number;
  practitioner?: number;
  status?: string;
  appointment_type?: string;
  page?: number;
  page_size?: number;
}

/**
 * Get all appointments with filters
 */
export const getAppointments = async (filters?: AppointmentFilters): Promise<{ results: Appointment[]; count: number }> => {
  const params = new URLSearchParams();
  
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.patient) params.append('patient', String(filters.patient));
  if (filters?.practitioner) params.append('practitioner', String(filters.practitioner));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.appointment_type) params.append('appointment_type', filters.appointment_type);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.page_size) params.append('page_size', String(filters.page_size));

  const response = await axiosInstance.get<{ results: Appointment[]; count: number }>(
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
export const createAppointment = async (data: CreateAppointmentData): Promise<Appointment> => {
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
 * Confirm appointment
 */
export const confirmAppointment = async (id: number): Promise<Appointment> => {
  const response = await axiosInstance.post<Appointment>(`/appointments/${id}/confirm/`);
  return response.data;
};

/**
 * Check in patient
 */
export const checkInAppointment = async (id: number): Promise<Appointment> => {
  const response = await axiosInstance.post<Appointment>(`/appointments/${id}/check_in/`);
  return response.data;
};

/**
 * Start appointment
 */
export const startAppointment = async (id: number): Promise<Appointment> => {
  const response = await axiosInstance.post<Appointment>(`/appointments/${id}/start/`);
  return response.data;
};

/**
 * Complete appointment
 */
export const completeAppointment = async (id: number): Promise<Appointment> => {
  const response = await axiosInstance.post<Appointment>(`/appointments/${id}/complete/`);
  return response.data;
};

/**
 * Cancel appointment
 */
export const cancelAppointment = async (id: number, reason: string): Promise<Appointment> => {
  const response = await axiosInstance.post<Appointment>(`/appointments/${id}/cancel/`, {
    reason,
  });
  return response.data;
};

/**
 * Get available time slots
 */
export const getAvailableSlots = async (
  practitionerId: number,
  date: string
): Promise<string[]> => {
  const response = await axiosInstance.get<{ available_slots: string[] }>(
    `/appointments/available_slots/?practitioner=${practitionerId}&date=${date}`
  );
  return response.data.available_slots;
};

/**
 * Get practitioner schedules
 */
export const getPractitionerSchedules = async (
  practitionerId?: number
): Promise<PractitionerSchedule[]> => {
  const params = practitionerId ? `?practitioner=${practitionerId}` : '';
  const response = await axiosInstance.get<{ results: PractitionerSchedule[] }>(
    `/practitioner-schedules/${params}`
  );
  return response.data.results;
};