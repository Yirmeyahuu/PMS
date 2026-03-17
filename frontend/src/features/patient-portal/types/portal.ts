export interface PortalPractitioner {
  id:             number | null;
  full_name:      string;
  specialization: string;
  bio:            string;
  avatar_url:     string | null;
}

export interface PortalService {
  id:               number;
  name:             string;
  description:      string;
  duration_minutes: number;
  price:            string;
  image_url:        string | null;
  is_active:        boolean;
  sort_order:       number;
  category:         number | null;
  category_name:    string | null;
  color_hex:        string;
}

export interface PortalCategory {
  id:          number | null;
  name:        string;
  description: string;
  services:    PortalService[];
}

export interface PortalData {
  token:          string;
  heading:        string;
  description:    string;
  clinic_name:    string;
  clinic_logo:    string | null;
  clinic_address: string;
  clinic_phone:   string;
  clinic_email:   string;
  categories:     PortalCategory[];
  practitioners:  PortalPractitioner[];
}

export interface BookingPayload {
  service:            number;
  practitioner?:      number | null;
  patient_first_name: string;
  patient_last_name:  string;
  patient_email:      string;
  patient_phone:      string;
  notes:              string;
  appointment_date:   string;
  appointment_time:   string;
}

export interface BookingConfirmation {
  id:                          number;
  reference_number:            string;
  status:                      string;
  patient_first_name:          string;
  patient_last_name:           string;
  patient_email:               string;
  patient_phone:               string;
  appointment_date:            string;
  appointment_time:            string;
  notes:                       string;
  service_name:                string;
  service_duration:            number;
  service_price:               string;
  practitioner_name:           string | null;
  practitioner_specialization: string | null;
  clinic_name:                 string;
  created_at:                  string;
}

export interface SlotsResponse {
  date:  string;
  slots: string[];
}