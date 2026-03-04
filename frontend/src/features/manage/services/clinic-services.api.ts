import axiosInstance from '@/lib/axios';

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
  created_at:       string;
  updated_at:       string;
}

export interface ClinicServicePayload {
  name:             string;
  description:      string;
  duration_minutes: number;
  price:            string;
  color_hex:        string;
  sort_order:       number;
  is_active:        boolean;
  show_in_portal:   boolean;
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
};