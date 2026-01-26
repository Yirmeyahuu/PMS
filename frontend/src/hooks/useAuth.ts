// User & Auth Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'PRACTITIONER' | 'STAFF';
  phone: string;
  avatar: string | null;
  is_active: boolean;
  clinic: number | null;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  role: 'STAFF' | 'PRACTITIONER';
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Clinic Types
export interface Clinic {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  tin: string;
  philhealth_accreditation: string;
  logo: string | null;
  website: string;
  timezone: string;
  is_active: boolean;
  subscription_plan: 'TRIAL' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  subscription_expires: string | null;
  created_at: string;
}

export interface Practitioner {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  clinic: number;
  license_number: string;
  specialization: string;
  prc_license: string;
  philhealth_accreditation: string;
  consultation_fee: string;
  bio: string;
  is_accepting_patients: boolean;
  created_at: string;
}

export interface Location {
  id: number;
  clinic: number;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  is_primary: boolean;
  is_active: boolean;
}

// API Response Types
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