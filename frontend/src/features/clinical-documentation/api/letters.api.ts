import api from '@/lib/axios';

export interface Letter {
  id: number;
  subject: string;
  status: 'DRAFT' | 'FINAL' | 'SENT';
  created_at: string;
  updated_at: string;
  rendered_pdf: string | null;
  patient_case: number | null;
  template: number | null;
  practitioner_name?: string;
  is_signed: boolean;
  sent_to: string[];
  content_html?: string;
}

export const getLetters = async (params: { patient?: string | number, patient_case?: number }): Promise<Letter[]> => {
  const queryParams = new URLSearchParams();
  if (params.patient) queryParams.append('patient', params.patient.toString());
  if (params.patient_case && params.patient_case !== -1) queryParams.append('patient_case', params.patient_case.toString());
  
  const response = await api.get(`/letters/letters/?${queryParams.toString()}`);
  return response.data.results || response.data;
};

export const generateLetter = async (data: {
  template_id: number;
  patient_id: string | number;
  subject: string;
  patient_case_id?: number;
  appointment_id?: number;
  content_html?: string;
}): Promise<Letter> => {
  const response = await api.post('/letters/letters/generate/', data);
  return response.data;
};

export const previewLetter = async (data: {
  template_id: number;
  patient_id: string | number;
  patient_case_id?: number;
  appointment_id?: number;
}): Promise<{ content_html: string }> => {
  const response = await api.post('/letters/letters/preview/', data);
  return response.data;
};

export const deleteLetter = async (id: number): Promise<void> => {
  await api.delete(`/letters/letters/${id}/`);
};

export const assignLetterToCase = async (id: number, patientCaseId: number): Promise<Letter> => {
  const response = await api.patch(`/letters/letters/${id}/`, {
    patient_case: patientCaseId
  });
  return response.data;
};

export const updateLetter = async (id: number, data: Partial<Letter>): Promise<Letter> => {
  const response = await api.patch(`/letters/letters/${id}/`, data);
  return response.data;
};
