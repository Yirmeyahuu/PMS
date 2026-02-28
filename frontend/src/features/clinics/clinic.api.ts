import api from '@/lib/axios';
import type { ClinicBranch, ClinicBranchesResponse, CreateBranchData } from '@/types/clinic';

export interface Practitioner {
  id: number;
  name: string;
  email: string;
  specialization: string | null;
  clinic_id: number;
  clinic_name: string | null;
  clinic_branch_id: number | null;
  clinic_branch_name: string | null;
}

export interface PractitionersResponse {
  practitioners: Practitioner[];
}

export const getPractitioners = async (clinicBranchId?: number | null): Promise<PractitionersResponse> => {
  const params: Record<string, any> = {};
  if (clinicBranchId) params.clinic_branch = clinicBranchId;
  const response = await api.get<PractitionersResponse>('/appointments/practitioners/', { params });
  return response.data;
};

export const getClinicBranches = async (): Promise<ClinicBranchesResponse> => {
  const response = await api.get<ClinicBranchesResponse>('/clinics/branches/');
  return response.data;
};

export const getPractitioner = async (id: number): Promise<Practitioner> => {
  const response = await api.get<Practitioner>(`/practitioners/${id}/`);
  return response.data;
};

/**
 * Create a new branch under the given main clinic
 */
export const createClinicBranch = async (
  mainClinicId: number,
  data: CreateBranchData
): Promise<ClinicBranch> => {
  const response = await api.post<ClinicBranch>(
    `/clinics/${mainClinicId}/create_branch/`,
    data
  );
  return response.data;
};

/**
 * Update an existing clinic branch
 */
export const updateClinicBranch = async (
  id: number,
  data: Partial<CreateBranchData>
): Promise<ClinicBranch> => {
  const response = await api.patch<ClinicBranch>(`/clinics/${id}/`, data);
  return response.data;
};