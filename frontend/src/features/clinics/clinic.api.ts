import api from '@/lib/axios';
import type { ClinicBranch, ClinicBranchesResponse } from '@/types/clinic';

export interface Practitioner {
  id: number;
  name: string;
  email: string;
  specialization: string | null;
  clinic_id: number;
  clinic_name: string | null;
}

export interface PractitionersResponse {
  practitioners: Practitioner[];
}

/**
 * Fetch all active practitioners for the current user's clinic
 * Optionally filter by clinic branch
 */
export const getPractitioners = async (clinicBranchId?: number | null): Promise<PractitionersResponse> => {
  const params = clinicBranchId ? { clinic_branch: clinicBranchId } : {};
  // ✅ FIXED: Removed /api prefix (already in baseURL)
  const response = await api.get<PractitionersResponse>('/appointments/practitioners/', { params });
  return response.data;
};

/**
 * Fetch all clinic branches for the current user's clinic
 */
export const getClinicBranches = async (): Promise<ClinicBranchesResponse> => {
  // ✅ FIXED: Removed /api prefix (already in baseURL)
  const response = await api.get<ClinicBranchesResponse>('/clinics/branches/');
  return response.data;
};

/**
 * Fetch a single practitioner by ID
 */
export const getPractitioner = async (id: number): Promise<Practitioner> => {
  // ✅ FIXED: Removed /api prefix (already in baseURL)
  const response = await api.get<Practitioner>(`/practitioners/${id}/`);
  return response.data;
};