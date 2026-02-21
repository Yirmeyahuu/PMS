// Re-export all types from individual modules
export * from './auth';
export * from './patient';
export * from './appointment';
export * from './contact';
export * from './clinic';

// Common types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  [key: string]: any;
}

// Auth types
export type { User, LoginCredentials, RegisterData, AuthTokens } from './auth';

// Patient types
export type { Patient, CreatePatientData, PatientFilters } from './patient';

// Clinic types
export type { Clinic, Location, Practitioner } from './clinic';

// Appointment types
export type {
  Appointment,
  CreateAppointmentData,
  PractitionerSchedule,
  AppointmentReminder,
} from './appointment';

export {
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_TYPE_LABELS,
} from './appointment';