import axiosInstance from '@/lib/axios';
import type { ClinicalTemplate, ClinicalNote, CreateClinicalNoteData } from '@/types/clinicalTemplate';

const BASE_URL = '/clinical-templates';

// ─── Template APIs ───────────────────────────────────────────────

export const getTemplates = async (): Promise<ClinicalTemplate[]> => {
  const response = await axiosInstance.get(`${BASE_URL}/templates/`);
  return response.data.results ?? response.data;
};

export const getActiveTemplates = async (): Promise<ClinicalTemplate[]> => {
  const response = await axiosInstance.get(`${BASE_URL}/templates/active/`);
  return response.data;
};

export const getTemplate = async (id: number): Promise<ClinicalTemplate> => {
  const response = await axiosInstance.get(`${BASE_URL}/templates/${id}/`);
  return response.data;
};

export const createTemplate = async (data: Partial<ClinicalTemplate>): Promise<ClinicalTemplate> => {
  try {
    const response = await axiosInstance.post(`${BASE_URL}/templates/`, data);
    return response.data;
  } catch (error: any) {
    // ✅ ADD THIS to see the actual validation errors
    console.error('Create template error response:', error.response?.data);
    throw error;
  }
};

export const updateTemplate = async (id: number, data: Partial<ClinicalTemplate>): Promise<ClinicalTemplate> => {
  const response = await axiosInstance.patch(`${BASE_URL}/templates/${id}/`, data);
  return response.data;
};

export const archiveTemplate = async (id: number): Promise<void> => {
  await axiosInstance.post(`${BASE_URL}/templates/${id}/archive/`);
};

export const createTemplateVersion = async (id: number): Promise<ClinicalTemplate> => {
  const response = await axiosInstance.post(`${BASE_URL}/templates/${id}/create_version/`);
  return response.data;
};

// ─── Clinical Note APIs ──────────────────────────────────────────

export const getNotes = async (filters?: {
  patient?: number;
  practitioner?: number;
  is_signed?: boolean;
  is_draft?: boolean;
}): Promise<ClinicalNote[]> => {
  const params = new URLSearchParams();
  if (filters?.patient) params.append('patient', String(filters.patient));
  if (filters?.practitioner) params.append('practitioner', String(filters.practitioner));
  if (filters?.is_signed !== undefined) params.append('is_signed', String(filters.is_signed));
  if (filters?.is_draft !== undefined) params.append('is_draft', String(filters.is_draft));

  const response = await axiosInstance.get(`${BASE_URL}/notes/?${params.toString()}`);
  return response.data.results ?? response.data;
};

export const getNote = async (id: number): Promise<ClinicalNote> => {
  const response = await axiosInstance.get(`${BASE_URL}/notes/${id}/`);
  return response.data;
};

export const createNote = async (data: CreateClinicalNoteData): Promise<ClinicalNote> => {
  const response = await axiosInstance.post(`${BASE_URL}/notes/`, data);
  return response.data;
};

export const updateNote = async (id: number, data: Partial<{ content: Record<string, any> }>): Promise<ClinicalNote> => {
  const response = await axiosInstance.patch(`${BASE_URL}/notes/${id}/`, data);
  return response.data;
};

export const signNote = async (id: number): Promise<ClinicalNote> => {
  const response = await axiosInstance.post(`${BASE_URL}/notes/${id}/sign/`);
  return response.data;
};

export const autosaveNote = async (id: number, content: Record<string, any>): Promise<{ detail: string; last_autosave: string }> => {
  const response = await axiosInstance.post(`${BASE_URL}/notes/${id}/autosave/`, { content });
  return response.data;
};

export const getNoteAuditLog = async (id: number) => {
  const response = await axiosInstance.get(`${BASE_URL}/notes/${id}/audit_log/`);
  return response.data;
};