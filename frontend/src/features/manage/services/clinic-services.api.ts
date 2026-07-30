import axiosInstance from '@/lib/axios';

// ── Discipline types ───────────────────────────────────────────────────────────

export interface DisciplineChoice {
  value: string;
  label: string;
}

// ── Service types ─────────────────────────────────────────────────────────────

export interface ClinicService {
  id:               number;
  clinic:           number;
  clinic_name:      string;
  name:             string;
  description:      string;
  duration_minutes: number;
  price:            string;
  image:            string | null;
  image_url:        string | null;
  color_hex:        string;
  sort_order:       number;
  is_active:        boolean;
  show_in_portal:   boolean;
  is_package:       boolean;
  session_allocation: number | null;
  /** Practitioner discipline this service is assigned to */
  discipline:       string;
  /** Human-readable discipline label returned by the API */
  discipline_label: string;
  /** @deprecated Legacy field — use discipline instead */
  assigned_practitioners: number[];
  created_at:       string;
  updated_at:       string;
}

export interface ClinicServicePayload {
  name:             string;
  description:      string;
  duration_minutes: number;
  price:            string;
  color_hex:        string;
  is_active:        boolean;
  show_in_portal:   boolean;
  is_package:       boolean;
  session_allocation: number | null;
  /** Practitioner discipline — required */
  discipline:       string;
}


export const clinicServicesApi = {
  list: async (): Promise<ClinicService[]> => {
    const res = await axiosInstance.get('/clinic-services/');
    return res.data.results ?? res.data;
  },

  create: async (data: ClinicServicePayload): Promise<ClinicService> => {
    const res = await axiosInstance.post('/clinic-services/', data);
    return res.data;
  },

  update: async (id: number, data: Partial<ClinicServicePayload>): Promise<ClinicService> => {
    const res = await axiosInstance.patch(`/clinic-services/${id}/`, data);
    return res.data;
  },

  toggleActive: async (id: number): Promise<{ id: number; is_active: boolean }> => {
    const res = await axiosInstance.patch(`/clinic-services/${id}/toggle_active/`, {});
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/clinic-services/${id}/`);
  },

  /** Fetch all available discipline choices from the backend. */
  getDisciplineChoices: async (): Promise<DisciplineChoice[]> => {
    const res = await axiosInstance.get('/clinic-services/discipline_choices/');
    return res.data;
  },

  /**
   * Fetch services filtered by a practitioner's discipline.
   * Used in appointment scheduling to scope service options.
   */
  getByDiscipline: async (discipline: string): Promise<ClinicService[]> => {
    const res = await axiosInstance.get('/clinic-services/by_discipline/', {
      params: { discipline },
    });
    return res.data.results ?? res.data;
  },
};