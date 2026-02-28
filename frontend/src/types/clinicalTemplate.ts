export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'checkbox_group'
  | 'radio'
  | 'pain_scale'
  | 'rich_text'
  | 'tags'
  | 'nested_group';

export interface FieldOption {
  value: string;
  label: string;
}

export interface ClinicalTemplate {
  id: number;
  clinic: number;
  created_by: number;
  created_by_name: string;
  name: string;
  description: string;
  category: 'INITIAL' | 'FOLLOW_UP' | 'PROGRESS' | 'DISCHARGE' | 'SOAP' | 'CUSTOM';
  structure: TemplateStructure;
  version: number;
  parent_template: number | null;
  is_active: boolean;
  is_archived: boolean;
  is_latest_version: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  rows?: number;
  options?: FieldOption[];
  fields?: TemplateField[]; // For nested groups
  defaultValue?: any;
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: TemplateField[];
}

export interface TemplateStructure {
  version: string;
  sections: TemplateSection[];
}

export interface ClinicalNote {
  id: number;
  patient: number;
  patient_name: string;
  practitioner: number;
  practitioner_name: string;
  appointment: number | null;
  clinic: number;
  template: number | null;
  template_name: string | null;
  template_version: number | null;
  date: string;
  note_type: string;
  is_signed: boolean;
  signed_at: string | null;
  is_draft: boolean;
  last_autosave: string | null;
  decrypted_content: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClinicalNoteData {
  patient: number;
  practitioner: number;
  appointment?: number | null;
  template: number;
  date: string;
  content: Record<string, any>;
}