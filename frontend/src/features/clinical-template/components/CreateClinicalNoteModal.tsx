import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Loader2, Save, Calendar, ClipboardList } from 'lucide-react';
import { getActiveTemplates, createNote } from '../clinical-templates.api';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import type { ClinicalTemplate, CreateClinicalNoteData, TemplateSection, TemplateField } from '@/types/clinicalTemplate';
import toast from 'react-hot-toast';

interface PatientAppointment {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  practitioner_name?: string;
  service_name?: string;
  status: string;
}

interface CreateClinicalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  appointmentId?: number;
  onSuccess?: () => void;
}

// Mock function to fetch appointments - replace with actual API call
const fetchPatientAppointments = async (patientId: number): Promise<PatientAppointment[]> => {
  // This would be replaced with actual API call
  // For now, return empty array - the modal will show a placeholder
  return [];
};

export const CreateClinicalNoteModal: React.FC<CreateClinicalNoteModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  appointmentId: initialAppointmentId,
  onSuccess,
}) => {
  const [step, setStep] = useState<'template' | 'form'>('template');
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(initialAppointmentId || null);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch templates on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const templatesData = await getActiveTemplates();
      setTemplates(templatesData);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset state
      setStep('template');
      setSelectedTemplate(null);
      setSelectedAppointment(initialAppointmentId || null);
      setContent({});
    }
  }, [isOpen, fetchData, initialAppointmentId]);

  const handleTemplateSelect = (template: ClinicalTemplate) => {
    setSelectedTemplate(template);
    // Initialize content with default values from template structure
    const initialContent: Record<string, unknown> = {};
    if (template.structure?.sections) {
      (template.structure.sections as TemplateSection[]).forEach((section: TemplateSection) => {
        if (section.fields) {
          (section.fields as TemplateField[]).forEach((field: TemplateField) => {
            if (field.type === 'checkbox') {
              initialContent[field.id] = false;
            } else if (field.type === 'checkbox_group') {
              initialContent[field.id] = [];
            } else if (field.type === 'tags') {
              initialContent[field.id] = [];
            } else {
              initialContent[field.id] = '';
            }
          });
        }
      });
    }
    setContent(initialContent);
    setStep('form');
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (!selectedAppointment) {
      toast.error('Please select a session');
      return;
    }

    setSaving(true);
    try {
      const noteData: CreateClinicalNoteData = {
        patient: patientId,
        practitioner: 0, // Will be auto-populated from appointment in backend
        template: selectedTemplate.id,
        date: noteDate,
        content,
        appointment: selectedAppointment,
      };

      await createNote(noteData);
      toast.success('Clinical note created successfully');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Create note error:', err);
      
      let message = 'Failed to create note';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { detail?: string } } }).response;
        if (response?.data) {
          if (typeof response.data === 'object') {
            const errors = Object.entries(response.data)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
            message = errors || response.data.detail || message;
          } else if (typeof response.data === 'string') {
            message = response.data;
          }
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      
      toast.error(message);
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Clinical Note</h2>
            <p className="text-sm text-gray-500">Patient: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
          ) : step === 'template' ? (
            // Step 1: Template Selection
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-semibold text-gray-700">Select a Template</h3>
              </div>
              
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active templates available. Please contact your administrator.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="flex flex-col items-start p-4 border border-gray-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-semibold text-gray-900 group-hover:text-sky-700">
                          {template.name}
                        </span>
                        {template.category && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {template.category}
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        v{template.version} · {template.structure?.sections?.length ?? 0} sections
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Step 2: Form Editor
            <div className="space-y-6">
              {/* Meta Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1.5">
                    <Calendar className="w-4 h-4" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1.5">
                    <ClipboardList className="w-4 h-4" />
                    Select Session
                  </label>
                  <input
                    type="number"
                    placeholder="Enter appointment/session ID"
                    value={selectedAppointment ?? ''}
                    onChange={(e) => setSelectedAppointment(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Session ID from patient's appointment
                  </p>
                </div>
              </div>

              {/* Template Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Template: {selectedTemplate?.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    (v{selectedTemplate?.version})
                  </span>
                </div>
                <button
                  onClick={() => setStep('template')}
                  className="text-xs text-sky-600 hover:text-sky-700"
                >
                  Change template
                </button>
              </div>

              {/* Dynamic Form */}
              {selectedTemplate && selectedTemplate.structure?.sections && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <DynamicFormRenderer
                    sections={selectedTemplate.structure.sections as TemplateSection[]}
                    values={content as Record<string, unknown>}
                    onChange={(fieldId, value) => setContent((prev) => ({ ...prev, [fieldId]: value }))}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {step === 'form' && (
            <button
              onClick={handleSave}
              disabled={saving || !selectedAppointment}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Note
            </button>
          )}
        </div>
      </div>
    </div>
  );
};