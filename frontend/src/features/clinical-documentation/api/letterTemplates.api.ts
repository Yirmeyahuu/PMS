import api from '@/lib/axios';

export interface LetterTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  discipline?: string;
  clinic_branch?: number | null;
  layout_letter_head: boolean;
  layout_remove_top_space: boolean;
  layout_date: boolean;
  layout_addressee: boolean;
  content_html: string;
  header_html?: string;
  footer_html?: string;
  is_active: boolean;
  version: number;
}

export const getActiveLetterTemplates = async (): Promise<LetterTemplate[]> => {
  const response = await api.get('/letters/templates/active/');
  return response.data;
};

export const getLetterTemplates = async (): Promise<LetterTemplate[]> => {
  const response = await api.get('/letters/templates/');
  return response.data.results || response.data;
};

export const createLetterTemplate = async (data: Partial<LetterTemplate>): Promise<LetterTemplate> => {
  const response = await api.post('/letters/templates/', data);
  return response.data;
};

export const updateLetterTemplate = async (id: number, data: Partial<LetterTemplate>): Promise<LetterTemplate> => {
  const response = await api.patch(`/letters/templates/${id}/`, data);
  return response.data;
};

export const archiveLetterTemplate = async (id: number): Promise<void> => {
  await api.patch(`/letters/templates/${id}/`, { is_active: false });
};
