import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, FileText, Loader2, Save, Calendar, ClipboardList } from 'lucide-react';
import { getActiveTemplates, createNote, getNote, getNotes } from '@/features/clinical-template/clinical-templates.api';
import { getAppointments } from '@/features/appointments/appointment.api';
import { DynamicFormRenderer } from '@/features/clinical-template/components/DynamicFormRenderer';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import type { ClinicalTemplate, CreateClinicalNoteData, TemplateSection, TemplateField, ClinicalNote } from '@/types/clinicalTemplate';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

export interface ClinicalNoteEditorProps {
  initialAppointmentId?: number;
}

export const ClinicalNoteEditor: React.FC<ClinicalNoteEditorProps> = ({ initialAppointmentId }) => {
  const { patient, cases, refreshCases } = usePatientProfileContext();
  const {
    selectedCaseId,
    editorContext,
    setEditorContext,
    triggerRefresh
  } = useClinicalWorkspace();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(null);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [existingNotes, setExistingNotes] = useState<ClinicalNote[]>([]);
  const [allDrafts, setAllDrafts] = useState<ClinicalNote[]>([]);
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  // Get current case title
  const currentCaseTitle = useMemo(() => {
    if (!selectedCaseId) return 'General';
    const foundCase = cases.find(c => c.id === selectedCaseId);
    return foundCase ? foundCase.title : 'General';
  }, [cases, selectedCaseId]);

  const fetchData = useCallback(async () => {
    if (!patient) return null;
    setLoading(true);
    try {
      const [templatesData, appointmentsData, notesData] = await Promise.all([
        getActiveTemplates(),
        getAppointments({ patient: patient.id, page_size: 100 }),
        getNotes({ patient: patient.id }),
      ]);

      const signedNotes = (notesData || []).filter(n => n.is_signed || !n.is_draft);
      const drafts = (notesData || []).filter(n => !n.is_signed || n.is_draft);

      setExistingNotes(signedNotes);
      setAllDrafts(drafts);

      // Sort appointments newest first
      let sortedAppointments = (appointmentsData.results || []).sort((a: Appointment, b: Appointment) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Filter appointments by case if selected
      if (selectedCaseId) {
        sortedAppointments = sortedAppointments.filter((appt: Appointment) =>
          appt.patient_case === selectedCaseId || (appt as any).patient_case_id === selectedCaseId
        );
      }

      setAppointments(sortedAppointments);
      return { templatesData, sortedAppointments, signedNotes };
    } catch (err) {
      toast.error('Failed to load data for note editor');
      return null;
    } finally {
      setLoading(false);
    }
  }, [patient, selectedCaseId]);

  useEffect(() => {
    if (editorContext.type !== 'NEW_NOTE' && editorContext.type !== 'COPY_NOTE') return;

    fetchData().then(async (result) => {
      if (!result) return;
      const { templatesData: fetchedTemplates, sortedAppointments, signedNotes } = result;
      
      // Initialize Appointment and Date
      let defaultApptId: number | null = null;
      let defaultDate = new Date().toISOString().split('T')[0];
      let isAutoSelected = false;
      
      if (initialAppointmentId) {
        const match = sortedAppointments.find(a => a.id === initialAppointmentId);
        const hasNote = signedNotes.some(n => n.appointment === initialAppointmentId);
        
        if (match && !hasNote) {
          defaultApptId = initialAppointmentId;
          defaultDate = match.date;
          isAutoSelected = true;
        }
      }
      setSelectedAppointment(defaultApptId);
      setNoteDate(defaultDate);
      setIsSessionLocked(isAutoSelected);


      if (editorContext.type === 'COPY_NOTE') {
        try {
          const sourceNote = await getNote(editorContext.sourceNoteId);
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
          }
        } catch (err) {
          toast.error('Failed to copy note');
          setEditorContext({ type: 'IDLE' });
        }
      } else if (editorContext.type === 'NEW_NOTE') {
        const template = fetchedTemplates.find(t => t.id === editorContext.templateId);
        if (template) {
          setSelectedTemplate(template);

          // Initialize default content
          const initialContent: Record<string, unknown> = {};
          if (template.structure?.sections) {
            (template.structure.sections as TemplateSection[]).forEach((section: TemplateSection) => {
              if (section.fields) {
                (section.fields as TemplateField[]).forEach((field: TemplateField) => {
                  if (field.type === 'section_header' || field.type === 'heading') return;
                  if (field.type === 'checkbox') initialContent[field.id] = false;
                  else if (field.type === 'checkbox_group') initialContent[field.id] = [];
                  else if (field.type === 'tags') initialContent[field.id] = [];
                  else if (field.type === 'scale' || field.type === 'number') initialContent[field.id] = field.defaultValue ?? '';
                  else if (field.type === 'chart') initialContent[field.id] = null;
                  else initialContent[field.id] = field.defaultValue ?? '';
                });
              }
            });
          }
          setContent(initialContent);
        }
      }
    });

  }, [editorContext, fetchData, setEditorContext, initialAppointmentId]);

  // Handle appointment selection
  const handleAppointmentSelect = (appointmentId: number) => {
    setSelectedAppointment(appointmentId);
    const selectedAppt = appointments.find(a => a.id === appointmentId);
    if (selectedAppt) {
      setNoteDate(selectedAppt.date);
    }
  };

  const handleSave = async (isFinalize: boolean = false) => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    if (!selectedAppointment) {
      toast.error('Please select a session');
      return;
    }
    if (!patient) return;

    const existingDraft = allDrafts.find(d => d.appointment === selectedAppointment);
    if (existingDraft && !isFinalize) {
      const confirmReplace = window.confirm(
        'A draft note already exists for this session. Do you want to replace it with this new note?'
      );
      if (!confirmReplace) return;
    }

    setSaving(true);
    try {
      const apptDetails = appointments.find(a => a.id === selectedAppointment);
      const noteData: CreateClinicalNoteData & { is_signed?: boolean } = {
        patient: patient.id,
        template: selectedTemplate.id,
        date: noteDate,
        content,
        appointment: selectedAppointment,
        patient_case: selectedCaseId || undefined,
        is_signed: isFinalize,
      };

      if (apptDetails?.practitioner) {
        noteData.practitioner = apptDetails.practitioner;
      }

      if (existingDraft) {
        const { updateNote } = await import('@/features/clinical-template/clinical-templates.api');
        await updateNote(existingDraft.id, noteData);
        toast.success(`Clinical note ${isFinalize ? 'finalized' : 'updated'} successfully`);
      } else {
        await createNote(noteData);
        toast.success(`Clinical note ${isFinalize ? 'finalized' : 'created'} successfully`);
      }

      triggerRefresh();
      refreshCases(); // Update case session counts (e.g., 6 out of 8 Sessions)
      setEditorContext({ type: 'IDLE' }); // go back to templates list on success
    } catch (err: unknown) {
      console.error('Create note error:', err);
      let message = 'Failed to save note';
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
    } finally {
      setSaving(false);
    }
  };

  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatTimeLabel = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 h-full">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading note editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header Breadcrumb & Back Action */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
        <button
          onClick={() => setEditorContext({ type: 'IDLE' })}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
          title="Back to Templates"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-sm font-medium text-slate-600 truncate">
          Clinical Note <span className="text-slate-400 mx-1">»</span>
          {currentCaseTitle} <span className="text-slate-400 mx-1">»</span>
          <span className="text-slate-900 font-bold">Create Clinical Note</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Meta Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" />
              Date
            </label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <ClipboardList className="w-3.5 h-3.5" />
              Session
            </label>
            {appointments.length === 0 ? (
              <div className="text-sm text-slate-500 py-2">
                No sessions found for this patient case.
              </div>
            ) : (
              <select
                value={selectedAppointment ?? ''}
                onChange={(e) => handleAppointmentSelect(Number(e.target.value))}
                disabled={isSessionLocked}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${isSessionLocked ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
              >
                <option value="">Select a session...</option>
                {appointments.map((appt) => {
                  const hasNote = existingNotes.some(n => n.appointment === appt.id);
                  return (
                    <option
                      key={appt.id}
                      value={appt.id}
                      disabled={hasNote}
                      title={hasNote ? 'This session has already a Clinical Note.' : undefined}
                    >
                      {formatDateLabel(appt.date)} — {formatTimeLabel(appt.start_time)}
                      {appt.practitioner_name ? ` — ${appt.practitioner_name}` : ''}
                      {hasNote ? ' (Note exists)' : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>

        {/* Template Info */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-600" />
          <span className="text-sm font-semibold text-slate-800">
            {selectedTemplate?.name}
          </span>
          <span className="text-xs text-slate-400">
            (v{selectedTemplate?.version})
          </span>
        </div>

        {/* Form Renderer */}
        {selectedTemplate && selectedTemplate.structure?.sections && (
          <div className="rounded-xl border border-slate-200 p-4 shadow-sm bg-white">
            <DynamicFormRenderer
              sections={selectedTemplate.structure.sections as TemplateSection[]}
              values={content as Record<string, unknown>}
              onChange={(fieldId, value) => setContent((prev) => ({ ...prev, [fieldId]: value }))}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !selectedAppointment}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> : null}
          Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || !selectedAppointment}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Finalize / Sign
        </button>
      </div>
    </div>
  );
};
