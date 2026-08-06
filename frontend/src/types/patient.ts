export interface Patient {
  id: number;
  clinic: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  philhealth_number: string;
  hmo_provider: string;
  hmo_number: string;
  medical_conditions: string;
  allergies: string;
  medications: string;
  patient_number: string;
  avatar: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_archived:      boolean;
  archived_at?:     string | null;
  archived_by?:     number | null;
  archived_by_name?: string | null;
  is_merged?:       boolean;
  merged_into?:     number | null;
  merged_at?:       string | null;
  merged_by?:       number | null;
  // Notification Settings
  send_email_notifications: boolean;
  sms_notifications_enabled: boolean;
  allow_push_notifications: boolean;
  data_sharing_preferences: Record<string, any>;
  possible_duplicate?: boolean;
  possible_duplicate_id?: number;
}

export interface IntakeForm {
  id: number;
  patient: number;
  patient_name: string;
  completed_by: number | null;
  completed_by_name: string;
  chief_complaint: string;
  complaint_onset: string;
  past_medical_history: string;
  surgical_history: string;
  family_history: string;
  social_history: string;
  system_review: Record<string, any>;
  consent_given: boolean;
  consent_date: string | null;
  created_at: string;
}

export type PatientCaseStatus = 'OPEN' | 'MONITORING' | 'DISCHARGED' | 'CLOSED';
export type PatientCasePayer = 'PRIVATE' | 'HMO' | 'INSURANCE' | 'CORPORATE' | '';

export interface PatientCaseSessionLog {
  id: number;
  patient_case: number;
  user: number | null;
  user_name: string;
  action: 'ADDED_SESSIONS' | 'REMOVED_SESSIONS' | 'REMOVED_LIMIT';
  amount: number | null;
  previous_limit: number | null;
  new_limit: number | null;
  created_at: string;
  updated_at: string;
}



export interface PatientCase {
  id: number;
  patient: number;
  patient_name: string;
  title: string;
  description: string;
  status: PatientCaseStatus;
  primary_practitioner: number | null;
  primary_practitioner_name: string | null;
  payer: PatientCasePayer;
  alert_notes: string;
  approved_sessions: number | null;
  completed_sessions: number;
  remaining_sessions: number | null;
  progress_text: string;
  allocation_status: 'ACTIVE' | 'EXHAUSTED' | 'UNLIMITED';
  is_unlimited: boolean;
  session_source: 'MANUAL' | 'PACKAGE';
  referred_by: string;
  referral_info: string;
  created_at: string;
  updated_at: string;

  package_invoice?: number | null;
  package_cost?: number;
  amount_paid?: number;
  outstanding_balance?: number;
  package_status?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | null;
  is_archived: boolean;
}

export interface CreatePatientData {
  clinic: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'M' | 'F' | 'O';
  email?: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  philhealth_number?: string;
  hmo_provider?: string;
  hmo_number?: string;
  medical_conditions?: string;
  allergies?: string;
  medications?: string;
  // Notification Settings
  send_email_notifications?: boolean;
  sms_notifications_enabled?: boolean;
  allow_push_notifications?: boolean;
  data_sharing_preferences?: Record<string, unknown>;
}