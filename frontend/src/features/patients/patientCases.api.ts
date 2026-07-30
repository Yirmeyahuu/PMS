import axiosInstance from '@/lib/axios';
import type { PatientCase, PatientCaseStatus, PatientCasePayer } from '@/types/patient';

const BASE_URL = '/patient-cases/';

export interface CreateCaseData {
  patient: number;
  title: string;
  description?: string;
  status?: PatientCaseStatus;
  primary_practitioner?: number;
  primary_practitioner_name?: string;
  payer?: PatientCasePayer;
  alert_notes?: string;
  referred_by?: string;
  referral_info?: string;
  session_source?: string;
  approved_sessions?: number;
  is_unlimited?: boolean;
}

export interface UpdateCaseData {
  title?: string;
  description?: string;
  status?: PatientCaseStatus;
  primary_practitioner?: number;
  primary_practitioner_name?: string;
  payer?: PatientCasePayer;
  alert_notes?: string;
  referred_by?: string;
  referral_info?: string;
  session_source?: string;
  approved_sessions?: number;
  is_unlimited?: boolean;
}

export const getPatientCases = async (patientId: number): Promise<PatientCase[]> => {
  const response = await axiosInstance.get(`${BASE_URL}?patient=${patientId}`);
  return response.data.results ?? response.data;
};

export const createPatientCase = async (data: CreateCaseData): Promise<PatientCase> => {
  const response = await axiosInstance.post(BASE_URL, data);
  return response.data;
};

export const updatePatientCase = async (caseId: number, data: UpdateCaseData): Promise<PatientCase> => {
  const response = await axiosInstance.patch(`${BASE_URL}${caseId}/`, data);
  return response.data;
};

export const deletePatientCase = async (caseId: number): Promise<void> => {
  await axiosInstance.delete(`${BASE_URL}${caseId}/`);
};

export const assignNoteToCase = async (noteId: number, caseId: number): Promise<void> => {
  await axiosInstance.patch(`/clinical-templates/notes/${noteId}/`, { patient_case: caseId });
};

export const addCaseSessions = async (caseId: number, amount: number): Promise<PatientCase> => {
  const response = await axiosInstance.post(`${BASE_URL}${caseId}/add_sessions/`, { amount });
  return response.data;
};

export const removeCaseSessionLimit = async (caseId: number): Promise<PatientCase> => {
  const response = await axiosInstance.post(`${BASE_URL}${caseId}/remove_limit/`);
  return response.data;
};

export const removeCaseSessions = async (caseId: number, amount: number): Promise<PatientCase> => {
  const response = await axiosInstance.post(`${BASE_URL}${caseId}/remove_sessions/`, { amount });
  return response.data;
};

export const resetCaseAllocation = async (caseId: number): Promise<PatientCase> => {
  const response = await axiosInstance.post(`${BASE_URL}${caseId}/reset_allocation/`);
  return response.data;
};

export const getCaseSessionLogs = async (caseId: number): Promise<any[]> => {
  const response = await axiosInstance.get(`${BASE_URL}${caseId}/session_logs/`);
  return response.data;
};