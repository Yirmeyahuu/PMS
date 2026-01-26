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
  password_changed: boolean;
  needs_password_change: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Admin Registration (auto-generated password)
export interface AdminRegisterData {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone?: string;
}

export interface AdminRegisterResponse {
  message: string;
  email_sent: boolean;
  user: User;
  tokens: AuthTokens;
  clinic: {
    id: number;
    name: string;
  };
}

// Regular User Registration (for staff/practitioner - created by admin)
export interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  role: 'STAFF' | 'PRACTITIONER';
  phone?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  needs_password_change?: boolean;
}

export interface AuthError {
  detail?: string;
  email?: string[];
  password?: string[];
  phone?: string[];
  first_name?: string[];
  last_name?: string[];
  company_name?: string[];
  non_field_errors?: string[];
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}