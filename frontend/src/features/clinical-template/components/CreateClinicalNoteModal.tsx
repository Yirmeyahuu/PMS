import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Loader2, Save, Calendar, ClipboardList, Plus, History } from 'lucide-react';
import { getActiveTemplates, createNote, getNotes, getNote } from '../clinical-templates.api';
import type { ClinicalNote } from '@/types/clinicalTemplate';
import { PreviewPreviousNoteModal } from './PreviewPreviousNoteModal';
import { getAppointments } from '@/features/appointments/appointment.api';
import { getPatientCases } from '@/features/patients/patientCases.api';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import type { ClinicalTemplate, CreateClinicalNoteData, TemplateSection, TemplateField } from '@/types/clinicalTemplate';
import type { PatientCase } from '@/types/patient';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

interface CreateClinicalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  appointmentId?: number;
  patientCaseId?: number;
  onSuccess?: () => void;
  existingNotes?: { appointment: number }[]; // Array of appointments that already have notes
  preselectedTemplateId?: number;
  copyFromNoteId?: number;
}

// Helper to format time
const formatTime = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper to format date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const CreateClinicalNoteModal: React.FC<CreateClinicalNoteModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  appointmentId: initialAppointmentId,
  patientCaseId,
  onSuccess,
  existingNotes = [],
  preselectedTemplateId,
  copyFromNoteId,
}) => {
  const [step, setStep] = useState<'template' | 'form'>('template');
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(initialAppointmentId || null);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previousNote, setPreviousNote] = useState<ClinicalNote | null>(null);
  const [allNotes, setAllNotes] = useState<ClinicalNote[]>([]);
  const [patientCases, setPatientCases] = useState<PatientCase[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const previousNoteCaseTitle = useMemo(() => {
    if (!previousNote || !patientCases.length) return '';
    let matchedCaseId: number | null = previousNote.patient_case || previousNote.patient_case_id || null;
    
    if (matchedCaseId) {
      const foundCase = patientCases.find(c => c.id === matchedCaseId);
      return foundCase?.title || '';
    }
    return '';
  }, [previousNote, patientCases]);

  const navigate = useNavigate();

  const handleGoToTemplates = () => {
    onClose();
    navigate('/manage', { state: { activeCategory: 'clinical', activeItem: 'clinical2' } });
  };

  // Fetch templates and appointments on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both templates and patient's appointments in parallel
      // Fetch templates, appointments, patient's previous notes, and cases
      const [templatesData, appointmentsData, notesData, casesData] = await Promise.all([
        getActiveTemplates(),
        getAppointments({ patient: patientId, page_size: 100 }),
        getNotes({ patient: patientId, is_draft: false }),
        getPatientCases(patientId),
      ]);
      
      setTemplates(templatesData);
      setPatientCases(casesData);
      setAllNotes(notesData || []);
      
      // Grab the most recent signed note for the copy feature
      if (notesData && notesData.length > 0) {
        if (patientCaseId) {
          // Look for note in the same case first (check DB fields and local storage links)
          const caseNote = notesData.find(n => {
            if (n.patient_case === patientCaseId || n.patient_case_id === patientCaseId) return true;
            return false;
          });
          setPreviousNote(caseNote || notesData[0]);
        } else {
          setPreviousNote(notesData[0]);
        }
      } else {
        setPreviousNote(null);
      }
      
      // Sort appointments by date (newest first)
      const sortedAppointments = (appointmentsData.results || []).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      console.log('[CreateClinicalNoteModal] sorted appointments:', sortedAppointments);
      setAppointments(sortedAppointments);
      
      return templatesData;
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [patientId, patientCaseId]);

  useEffect(() => {
    if (isOpen) {
      fetchData().then(async (fetchedTemplates) => {
        if (copyFromNoteId && fetchedTemplates) {
          try {
            const sourceNote = await getNote(copyFromNoteId);
            const template = fetchedTemplates.find(t => t.id === sourceNote.template);
            if (template) {
              setSelectedTemplate(template);
              let mergedValues = { ...sourceNote.decrypted_content };
              if (sourceNote.chart_annotation_data) {
                Object.entries(sourceNote.chart_annotation_data).forEach(([fieldId, annotationData]: [string, any]) => {
                  mergedValues[fieldId] = {
                    canvas_image: mergedValues[fieldId] || null,
                    doodle_data: annotationData.doodle_data || [],
                  };
                });
              }
              setContent(mergedValues);
              setStep('form');
            } else {
              setStep('template');
              setSelectedTemplate(null);
            }
          } catch (err) {
            toast.error('Failed to copy note');
            setStep('template');
          }
        } else if (preselectedTemplateId && fetchedTemplates) {
          const template = fetchedTemplates.find(t => t.id === preselectedTemplateId);
          if (template) {
            setSelectedTemplate(template);
            setStep('form');
          } else {
            setStep('template');
            setSelectedTemplate(null);
          }
        } else {
          setStep('template');
          setSelectedTemplate(null);
        }
      });
      // Reset state
      setSelectedAppointment(initialAppointmentId || null);
      if (!copyFromNoteId) setContent({});
      setNoteDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, fetchData, initialAppointmentId, preselectedTemplateId, copyFromNoteId]);

  const isAppointmentMode = Boolean(initialAppointmentId);

  // Handle appointment selection - auto-set date from appointment
  const handleAppointmentSelect = (appointmentId: number) => {
    setSelectedAppointment(appointmentId);
    // Auto-populate date from the selected appointment
    const selectedAppt = appointments.find(a => a.id === appointmentId);
    if (selectedAppt) {
      setNoteDate(selectedAppt.date);
    }
  };

  // Auto-populate date for appointment mode when appointments load
  useEffect(() => {
    if (isAppointmentMode && initialAppointmentId && appointments.length > 0) {
      const selectedAppt = appointments.find(a => a.id === initialAppointmentId);
      if (selectedAppt) {
        setNoteDate(selectedAppt.date);
      }
    }
  }, [appointments, initialAppointmentId, isAppointmentMode]);

  const handleTemplateSelect = (template: ClinicalTemplate) => {
    setSelectedTemplate(template);
    // Initialize content with default values from template structure
    const initialContent: Record<string, unknown> = {};
    if (template.structure?.sections) {
      (template.structure.sections as TemplateSection[]).forEach((section: TemplateSection) => {
        if (section.fields) {
          (section.fields as TemplateField[]).forEach((field: TemplateField) => {
            // Skip non-input field types
            if (field.type === 'section_header' || field.type === 'heading') return;
            
            if (field.type === 'checkbox') {
              initialContent[field.id] = false;
            } else if (field.type === 'checkbox_group') {
              initialContent[field.id] = [];
            } else if (field.type === 'tags') {
              initialContent[field.id] = [];
            } else if (field.type === 'scale' || field.type === 'number') {
              initialContent[field.id] = field.defaultValue ?? '';
            } else if (field.type === 'chart') {
              initialContent[field.id] = null;
            } else {
              initialContent[field.id] = field.defaultValue ?? '';
            }
          });
        }
      });
    }
    setContent(initialContent);
    setStep('form');
  };

  const handleCopyPreviousSession = (reconstructedContent: Record<string, unknown>) => {
    if (previousNote?.template) {
      const templateToUse = templates.find(t => t.id === previousNote.template);
      if (templateToUse) {
        setSelectedTemplate(templateToUse);
        setContent(reconstructedContent);
        setStep('form');
        setIsPreviewModalOpen(false);
        toast.success('Successfully copied previous session content.');
        return;
      }
    }
    
    // Fallback if template was deleted
    toast.error('The template used in the previous session is no longer available.');
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
      // Get practitioner from selected appointment
      const practitionerId = selectedAppointmentDetails?.practitioner;
      
      console.log('[CreateClinicalNoteModal] Saving note with:', {
        patient: patientId,
        practitioner: practitionerId,
        template: selectedTemplate.id,
        date: noteDate,
        appointment: selectedAppointment,
        content: content,
      });

      // Build note data - only include practitioner if it's a valid ID
      const noteData: CreateClinicalNoteData = {
        patient: patientId,
        template: selectedTemplate.id,
        date: noteDate,
        content,
        appointment: selectedAppointment,
      };

      // Only add practitioner if we have a valid ID
      if (practitionerId) {
        noteData.practitioner = practitionerId;
      }

      console.log('[ClinicalNote Create] Incoming Request:', JSON.stringify(noteData, null, 2));

      await createNote(noteData);
      console.log('[CreateClinicalNoteModal] Note created successfully!');
      toast.success('Clinical note created successfully');
      console.log('[CreateClinicalNoteModal] Calling onSuccess callback...');
      onSuccess?.();
      console.log('[CreateClinicalNoteModal] Closing modal...');
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

  // Get selected appointment details for preview
  const selectedAppointmentDetails = useMemo(() => {
    const details = appointments.find(a => a.id === selectedAppointment);
    console.log('[CreateClinicalNoteModal] selectedAppointment:', selectedAppointment);
    console.log('[CreateClinicalNoteModal] appointments:', appointments);
    console.log('[CreateClinicalNoteModal] selectedAppointmentDetails:', details);
    console.log('[CreateClinicalNoteModal] practitioner_avatar:', details?.practitioner_avatar);
    return details;
  }, [appointments, selectedAppointment]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1400px] h-[90vh] flex flex-col">
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
        <div className="flex-1 overflow-hidden p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
          ) : step === 'template' ? (
            // Step 1: Template Selection
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-600" />
                  <h3 className="text-sm font-semibold text-gray-700">Select a Template</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGoToTemplates}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Template
                  </button>
                  {previousNote && (
                    <button
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <History className="w-4 h-4" />
                      Copy Previous Session
                    </button>
                  )}
                </div>
              </div>
              
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active templates available. Create one from the Clinical Templates page.
                </div>
              ) : (() => {
                // Group templates by discipline; no discipline → "General"
                const grouped = templates.reduce<Record<string, ClinicalTemplate[]>>((acc, t) => {
                  const group = t.discipline?.trim() || 'General';
                  if (!acc[group]) acc[group] = [];
                  acc[group].push(t);
                  return acc;
                }, {});
                const sortedGroups = Object.keys(grouped).sort((a, b) => {
                  if (a === 'General') return -1;
                  if (b === 'General') return 1;
                  return a.localeCompare(b);
                });
                return (
                  <div className="space-y-6 overflow-y-auto">
                    {sortedGroups.map((group) => (
                      <div key={group}>
                        {/* Section Header */}
                        <div className="border-b border-gray-200 pb-2 mb-3">
                          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group}</h2>
                        </div>
                        {/* Template Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {grouped[group].map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleTemplateSelect(template)}
                              className="flex flex-col items-start p-4 border border-gray-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 transition-all text-left group"
                            >
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900 group-hover:text-sky-700">
                                  {template.name}
                                </span>
                                {template.discipline && (
                                  <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
                                    {template.discipline}
                                  </span>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                                <span>v{template.version}</span>
                                <span>·</span>
                                <span>{template.structure?.sections?.reduce((acc: number, s: TemplateSection) => acc + (s.fields?.length || 0), 0) || 0} fields</span>
                                {template.clinic_branch_name && (
                                  <>
                                    <span>·</span>
                                    <span>{template.clinic_branch_name}</span>
                                  </>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            // Step 2: Form Editor (single column)
            <div className="h-full overflow-y-auto">
              <div className="space-y-6 max-w-3xl mx-auto">
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
                      Session
                    </label>
                    {isAppointmentMode && selectedAppointmentDetails ? (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-900">
                            {formatDate(selectedAppointmentDetails.date)} — {formatTime(selectedAppointmentDetails.start_time)}
                          </p>
                          <span className="text-[10px] font-medium bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full">Linked</span>
                        </div>
                        {selectedAppointmentDetails.practitioner_name && (
                          <p className="text-xs text-gray-500">{selectedAppointmentDetails.practitioner_name}</p>
                        )}
                        {selectedAppointmentDetails.service_name && (
                          <p className="text-xs text-gray-500">{selectedAppointmentDetails.service_name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2 italic">(Linked from Appointment)</p>
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="text-sm text-gray-500 py-2">
                        No sessions found for this patient.
                      </div>
                    ) : (
                      <>
                        <select
                          value={selectedAppointment ?? ''}
                          onChange={(e) => handleAppointmentSelect(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                        >
                          <option value="">Select a session...</option>
                          {appointments.map((appt) => {
                            const hasNote = existingNotes.some(note => note.appointment === appt.id);
                            return (
                              <option 
                                key={appt.id} 
                                value={appt.id}
                                disabled={hasNote}
                                title={hasNote ? 'This session has already a Clinical Note.' : undefined}
                              >
                                {formatDate(appt.date)} — {formatTime(appt.start_time)}
                                {appt.practitioner_name ? ` — ${appt.practitioner_name}` : ''}
                                {appt.service_name ? ` — ${appt.service_name}` : ''}
                                {hasNote ? ' (Note exists)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                          Select the patient's session
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Template Info */}
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Template: {selectedTemplate?.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    (v{selectedTemplate?.version})
                  </span>
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

      {/* Preview Previous Session Modal */}
      {previousNote && (
        <PreviewPreviousNoteModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          sourceNote={previousNote}
          sourceNoteCaseTitle={previousNoteCaseTitle}
          templateStructure={templates.find(t => t.id === previousNote.template)?.structure}
          onCopy={handleCopyPreviousSession}
          allNotes={allNotes}
          onSelectNote={(note) => setPreviousNote(note)}
          patientCases={patientCases}
        />
      )}
    </div>
  );
};
