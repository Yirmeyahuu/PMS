export type TitleType = 'Mr' | 'Ms' | 'Mrs' | 'Miss' | 'Dr' | 'Prof' | 'Assoc Prof';

export type DisciplineType = 
  | 'OCCUPATIONAL_THERAPY'
  | 'SPEECH_LANGUAGE_PATHOLOGIST'
  | 'PHYSICAL_THERAPY'
  | 'OSTEOPATHY'
  | 'DENTISTRY'
  | 'MD_GENERAL_PRACTITIONER';

export type GenderType = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface StaffMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  nickname?: string;
  title?: TitleType;
  role: 'STAFF' | 'PRACTITIONER';
  phone: string;
  avatar: string | null;
  is_active: boolean;
  clinic: number;
  clinic_branch?: number | null;
  clinic_branch_name?: string | null;
  created_at: string;
  password_changed: boolean;

  // Additional staff fields
  position?: string;
  discipline?: DisciplineType;
  date_of_birth?: string;
  gender?: GenderType;
  address?: string;
}

export interface CreateStaffData {
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  nickname?: string;
  title?: TitleType;
  role: 'STAFF' | 'PRACTITIONER';
  phone: string;
  position?: string;
  discipline?: DisciplineType;
  date_of_birth?: string;
  gender?: GenderType;
  address?: string;
  clinic_branch?: number | null;
}

export interface StaffFormErrors {
  first_name?: string;
  last_name?: string;
  title?: string;
  position?: string;
  discipline?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  clinic_branch?: string;
  general?: string;
}

// Title options for dropdown
export const TITLE_OPTIONS: { value: TitleType; label: string }[] = [
  { value: 'Mr', label: 'Mr.' },
  { value: 'Ms', label: 'Ms.' },
  { value: 'Mrs', label: 'Mrs.' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Dr', label: 'Dr.' },
  { value: 'Prof', label: 'Prof.' },
  { value: 'Assoc Prof', label: 'Assoc. Prof.' },
];

// Discipline options for dropdown
export const DISCIPLINE_OPTIONS: { value: DisciplineType; label: string }[] = [
  { value: 'OCCUPATIONAL_THERAPY', label: 'Occupational Therapy' },
  { value: 'SPEECH_LANGUAGE_PATHOLOGIST', label: 'Speech Language Pathologist' },
  { value: 'PHYSICAL_THERAPY', label: 'Physical Therapy' },
  { value: 'OSTEOPATHY', label: 'Osteopathy' },
  { value: 'DENTISTRY', label: 'Dentistry' },
  { value: 'MD_GENERAL_PRACTITIONER', label: 'MD: General Practitioner' },
];

// Gender options for dropdown
export const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];