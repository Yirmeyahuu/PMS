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
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  philhealth_number?: string;
  hmo_provider?: string;
  hmo_number?: string;
  medical_conditions?: string;
  allergies?: string;
  medications?: string;
}