export interface PortalService {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: string;          // decimal comes back as string from DRF
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  category: number | null;
  category_name: string | null;
}

export interface PortalCategory {
  id: number | null;
  name: string;
  description: string;
  services: PortalService[];
}

export interface PortalData {
  token: string;
  heading: string;
  description: string;
  clinic_name: string;
  clinic_logo: string | null;
  clinic_address: string;
  categories: PortalCategory[];
}

export interface BookingPayload {
  service: number;
  practitioner?: number | null;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone: string;
  notes?: string;
  appointment_date: string;   // YYYY-MM-DD
  appointment_time: string;   // HH:MM
}

export interface BookingConfirmation {
  id: number;
  reference_number: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  service_name: string;
  service_duration: number;
  service_price: string;
  practitioner_name: string | null;
  practitioner_specialization: string | null;
  clinic_name: string;
  created_at: string;
}

export interface SlotsResponse {
  date: string;
  slots: string[];   // ['09:00', '10:00', ...]
}