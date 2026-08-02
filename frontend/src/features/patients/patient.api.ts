import axiosInstance from '@/lib/axios';
import type { Patient, CreatePatientData, PaginatedResponse } from '@/types';

export interface PatientFilters {
  search?: string;
  gender?: 'M' | 'F' | 'O' | '';
  is_active?: boolean;
  // ── Archive filters ──────────────────────────────────────────────────────
  archived?: boolean;          // ?archived=true  → only archived patients
  include_archived?: boolean;  // ?include_archived=true → all patients
  page?: number;
  page_size?: number;
}

export interface ArchiveResponse {
  detail: string;
  patient_id: number;
  is_archived: boolean;
  archived_at?: string;
  archived_by?: string;
}

export interface PatientConsentRecord {
  id: number;
  patient: number | null;
  patient_name?: string;
  clinic_name?: string;
  portal_link: number | null;
  type: string;
  full_name: string;
  email: string;
  consent_text: string;
  signature: string;
  created_at: string;
}

/**
 * Get all patients with filters
 */
export const getPatients = async (filters?: PatientFilters): Promise<PaginatedResponse<Patient>> => {
  const params = new URLSearchParams();

  if (filters?.search)                          params.append('search',           filters.search);
  if (filters?.gender)                          params.append('gender',           filters.gender);
  if (filters?.is_active !== undefined)         params.append('is_active',        String(filters.is_active));
  if (filters?.archived === true)               params.append('archived',         'true');
  if (filters?.include_archived === true)       params.append('include_archived', 'true');
  if (filters?.page)                            params.append('page',             String(filters.page));
  if (filters?.page_size)                       params.append('page_size',        String(filters.page_size));

  const response = await axiosInstance.get<PaginatedResponse<Patient>>(
    `/patients/?${params.toString()}`
  );
  return response.data;
};

/**
 * Get single patient by ID
 */
export const getPatient = async (id: number): Promise<Patient> => {
  const response = await axiosInstance.get<Patient>(`/patients/${id}/`);
  return response.data;
};

import React from 'react';
import toast from 'react-hot-toast';
import { DuplicateToast } from './components/DuplicateToast';

/**
 * Create new patient
 */
export const createPatient = async (data: CreatePatientData): Promise<Patient> => {
  const response = await axiosInstance.post<Patient>('/patients/', data);
  
  if (response.data.possible_duplicate && response.data.possible_duplicate_id) {
    toast.custom(
      (t) => React.createElement(DuplicateToast, { 
        t, 
        duplicatePatientId: response.data.possible_duplicate_id as number
      }), 
      { duration: 8000 }
    );
  }
  
  return response.data;
};

/**
 * Update patient
 */
export const updatePatient = async (id: number, data: Partial<CreatePatientData>): Promise<Patient> => {
  const response = await axiosInstance.patch<Patient>(`/patients/${id}/`, data);
  return response.data;
};

/**
 * Delete patient (soft delete)
 */
export const deletePatient = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/patients/${id}/`);
};

/**
 * Archive a patient — hides them and their appointments from the diary.
 * POST /patients/{id}/archive/
 */
export const archivePatient = async (id: number): Promise<ArchiveResponse> => {
  const response = await axiosInstance.post<ArchiveResponse>(`/patients/${id}/archive/`);
  return response.data;
};

/**
 * Restore an archived patient — makes them and their appointments visible again.
 * POST /patients/{id}/restore/
 */
export const restorePatient = async (id: number): Promise<ArchiveResponse> => {
  const response = await axiosInstance.post<ArchiveResponse>(`/patients/${id}/restore/`);
  return response.data;
};

/**
 * Get patient intake forms
 */
export const getPatientIntakeForms = async (patientId: number) => {
  const response = await axiosInstance.get(`/patients/${patientId}/intake_forms/`);
  return response.data;
};

/**
 * Get patient legal/privacy consents
 */
export const getPatientConsents = async (patientId: number): Promise<PatientConsentRecord[]> => {
  const response = await axiosInstance.get<PatientConsentRecord[]>(`/patients/${patientId}/consents/`);
  return response.data;
};

export interface CreateConsentPayload {
  full_name: string;
  email: string;
  consent_text: string;
  signature: string;
  type?: string;
}

/**
 * Create or replace the patient's consent form (one per patient per type).
 */
export const createOrUpdateConsent = async (
  patientId: number,
  payload: CreateConsentPayload,
): Promise<PatientConsentRecord> => {
  const response = await axiosInstance.post<PatientConsentRecord>(
    `/patients/${patientId}/create_consent/`,
    payload,
  );
  return response.data;
};

// ─── Client Form Request ───────────────────────────────────────────────────

export interface ClientFormRequestRecord {
  id: number;
  patient: number;
  patient_name: string;
  patient_email: string;
  token: string;
  expires_at: string;
  is_completed: boolean;
  completed_at: string | null;
  is_expired: boolean;
  sent_by: number | null;
  sent_by_name: string | null;
  created_at: string;
  accepted_terms:   boolean;
  accepted_privacy: boolean;
  accepted_at:      string | null;
}

/**
 * Send a client form request email to the patient.
 * POST /patients/{id}/send_client_form/
 */
export const sendClientForm = async (
  patientId: number,
  options?: { to?: string; body?: string },
): Promise<ClientFormRequestRecord> => {
  const response = await axiosInstance.post<ClientFormRequestRecord>(
    `/patients/${patientId}/send_client_form/`,
    options ?? {},
  );
  return response.data;
};

/**
 * List all client form requests for a patient.
 * GET /patients/{id}/client_form_requests/
 */
export const getClientFormRequests = async (patientId: number): Promise<ClientFormRequestRecord[]> => {
  const response = await axiosInstance.get<ClientFormRequestRecord[]>(
    `/patients/${patientId}/client_form_requests/`,
  );
  return response.data;
};

// ─── Patient Consent Document ─────────────────────────────────────────────────

export interface PatientConsentDocumentRecord {
  id: number;
  patient: number | null;
  patient_name?: string;
  appointment: number | null;
  appointment_id: number | null;
  patient_case: number | null;
  patient_case_id: number | null;
  clinic: number;
  clinic_name: string;
  type: string;
  title: string;
  header_snapshot: string;
  body_snapshot: string;
  signature: string;
  signed_at: string;
  consent_version: string;
  signer_full_name: string;
  signer_email: string;
  created_at: string;
}

/**
 * Get patient consent documents (historical clinic consent snapshots).
 * GET /patients/{id}/consent_documents/
 */
export const getPatientConsentDocuments = async (patientId: number): Promise<PatientConsentDocumentRecord[]> => {
  const response = await axiosInstance.get<PatientConsentDocumentRecord[]>(
    `/patients/${patientId}/consent_documents/`,
  );
  return response.data;
};

export interface CreatePatientConsentDocumentPayload {
  title: string;
  header_snapshot: string;
  body_snapshot: string;
  signature: string;
  consent_version: string;
  signer_full_name: string;
  signer_email: string;
  type: string;
  appointment_id?: number | null;
  patient_case_id?: number | null;
}

/**
 * Create a patient consent document manually from the workspace.
 * POST /patients/{id}/create_consent_document/
 */
export const createConsentDocument = async (patientId: number, data: CreatePatientConsentDocumentPayload): Promise<PatientConsentDocumentRecord> => {
  const response = await axiosInstance.post<PatientConsentDocumentRecord>(
    `/patients/${patientId}/create_consent_document/`,
    data
  );
  return response.data;
};
export interface ActivityTimelineItem {
  id: string;
  type: 'NOTE' | 'LETTER' | 'DOCUMENT' | 'SESSION_LOG';
  title: string;
  description: string;
  date: string;
  case_id: number | null;
  metadata: any;
}

export const getPatientActivityTimeline = async (patientId: string | number, caseId?: number): Promise<ActivityTimelineItem[]> => {
  const params = caseId ? { case_id: caseId } : {};
  const response = await axiosInstance.get(`/patients/${patientId}/activity_timeline/`, { params });
  return response.data;
};

// ─── Patient Merge APIs ──────────────────────────────────────────────────

export interface PatientMergePreview {
  cases: number;
  appointments: number;
  clinical_notes: number;
  invoices: number;
  attachments: number;
  letters: number;
  communications: number;
}

export const previewPatientMerge = async (primaryId: number, duplicateId: number): Promise<PatientMergePreview> => {
  const response = await axiosInstance.post<PatientMergePreview>('/merge/preview/', {
    primary_patient_id: primaryId,
    duplicate_patient_id: duplicateId,
  });
  return response.data;
};

export const executePatientMerge = async (primaryId: number, duplicateId: number, reason?: string): Promise<{ detail: string; merge_id: string }> => {
  const response = await axiosInstance.post<{ detail: string; merge_id: string }>('/merge/execute/', {
    primary_patient_id: primaryId,
    duplicate_patient_id: duplicateId,
    reason: reason || '',
  });
  return response.data;
};

export const assignConsentDocument = async (patientId: number, documentId: number, patientCaseId: number): Promise<PatientConsentDocumentRecord> => {
  const response = await axiosInstance.post<PatientConsentDocumentRecord>(`/patients/${patientId}/assign_consent_document/`, {
    document_id: documentId,
    patient_case_id: patientCaseId
  });
  return response.data;
};
