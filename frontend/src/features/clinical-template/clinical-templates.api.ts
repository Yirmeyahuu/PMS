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

// ─── Email & Print APIs ──────────────────────────────────────────

export const emailNote = async (id: number): Promise<{ detail: string }> => {
  const response = await axiosInstance.post(`${BASE_URL}/notes/${id}/email_note/`);
  return response.data;
};

export interface PrintNoteResponse {
  patient_name: string;
  patient_number: string;
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_email: string;
  practitioner_name: string;
  practitioner_title: string;
  date: string | null;
  template_name: string;
  template_category: string;
  note_type: string;
  is_signed: boolean;
  signed_at: string | null;
  created_at: string | null;
  sections: Array<{
    title: string;
    description: string;
    fields: Array<{
      label: string;
      value: string;
    }>;
  }>;
}

export const getPrintNote = async (id: number): Promise<PrintNoteResponse> => {
  const response = await axiosInstance.get(`${BASE_URL}/notes/${id}/print_note/`);
  return response.data;
};