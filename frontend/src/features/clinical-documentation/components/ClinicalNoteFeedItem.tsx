import React, { useState, useEffect } from 'react';
import { Loader2, Save, FileText, CheckCircle, Copy, X, ChevronDown, ChevronRight, Printer, Mail, Edit } from 'lucide-react';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { createNote, updateNote } from '@/features/clinical-template/clinical-templates.api';
import { SendNoteEmailModal } from './SendNoteEmailModal';
import { PrintNoteModal } from './PrintNoteModal';
import { DynamicFormRenderer } from '@/features/clinical-template/components/DynamicFormRenderer';
import { useQuery } from '@tanstack/react-query';
import { getMyClinic } from '@/features/clinics/clinic.api';
import type { ClinicalTemplate, ClinicalNote } from '@/types/clinicalTemplate';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

interface ClinicalNoteFeedItemProps {
  isNewNote?: boolean;
  initialTemplateId?: number | null;
  note?: ClinicalNote;
  appointments: Appointment[];
  templates: ClinicalTemplate[];
  onCancelNewNote?: () => void;
  onRefreshFeed: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const ClinicalNoteFeedItem: React.FC<ClinicalNoteFeedItemProps> = ({
  isNewNote = false,
  initialTemplateId,
  note,
  appointments,
  templates,
  onCancelNewNote,
  onRefreshFeed,
  isExpanded = true,
  onToggleExpand
}) => {
  const { patient } = usePatientProfileContext();
  const { selectedCaseId, setEditorContext } = useClinicalWorkspace();

  const [saving, setSaving] = useState(false);
  
  const { data: clinicProfile } = useQuery({
    queryKey: ['myClinic'],
    queryFn: getMyClinic,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
  
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(null);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  

  // Make all history items (signed and drafts) strictly read-only in the feed.
  // The only editable item is the new note creation block.
  const isReadOnly = !isNewNote;


  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isNewNote && initialTemplateId) {
        const tmpl = templates.find(t => t.id === initialTemplateId);
        if (tmpl && isMounted) {
          setSelectedTemplateId(tmpl.id);
          setSelectedTemplate(tmpl);
        }
      } else if (note) {
        setSelectedAppointment(note.appointment);
        setNoteDate(note.date);
        
        if (note.template) {
          let tmpl = templates.find(t => t.id === note.template);
          
          if (!tmpl) {
            // Template might be inactive, fetch explicitly
            try {
              const { getTemplate } = await import('@/features/clinical-template/clinical-templates.api');
              tmpl = await getTemplate(note.template);
            } catch (err) {
              console.error('Failed to load inactive template', err);
            }
          }
          
          if (tmpl && isMounted) {
            setSelectedTemplateId(tmpl.id);
            setSelectedTemplate(tmpl);
          }
        }
        
        if (note.decrypted_content && isMounted) {
          const mergedValues = { ...note.decrypted_content };
          if (note.chart_annotation_data) {
            Object.entries(note.chart_annotation_data).forEach(([fieldId, annotationData]: [string, any]) => {
              mergedValues[fieldId] = {
                canvas_image: mergedValues[fieldId] || null,
                doodle_data: annotationData.doodle_data || [],
              };
            });
          }
          setContent(mergedValues);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isNewNote, initialTemplateId, note, templates]);

  const handleLoadTemplate = () => {
    if (!selectedTemplateId || isReadOnly) return;
    const tmpl = templates.find(t => t.id === selectedTemplateId);
    if (tmpl) {
      setSelectedTemplate(tmpl);
      setContent({}); // reset content on new template load
    }
  };

  const handleSave = async (sign: boolean = false) => {
    if (!patient || !selectedAppointment || !selectedTemplate) {
      toast.error('Please select an appointment and template');
      return;
    }

    setSaving(true);
    try {
      const noteData = {
        patient: patient.id,
        appointment: selectedAppointment,
        template: selectedTemplate.id,
        date: noteDate,
        content,
        patient_case: selectedCaseId || undefined,
        is_signed: sign,
        amendment_reason: undefined
      };

      if (isNewNote) {
        await createNote(noteData);
        toast.success(sign ? 'Note signed successfully' : 'Draft saved successfully');
        if (onCancelNewNote) onCancelNewNote(); // close the inline create form
      } else if (note) {
        await updateNote(note.id, noteData);
        toast.success(sign ? 'Note signed successfully' : 'Draft updated successfully');
      }
      onRefreshFeed();
    } catch (error) {
      console.error('Failed to save note', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const appt = appointments.find(a => a.id === selectedAppointment);
  const practitionerName = note?.practitioner_name || appt?.practitioner_name || 'Practitioner';
  const practitionerAvatar = note?.practitioner_avatar || appt?.practitioner_avatar || null;
  const clinicBranchName = appt?.location_name || selectedTemplate?.clinic_branch_name || 'Malasakit Clinic';

  return (
    <div className={`mb-8 rounded-xl bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] overflow-hidden transition-all ${isNewNote ? 'border-2 border-indigo-400 ring-4 ring-indigo-400/10' : 'border border-slate-200'}`}>
      {/* Malasakit Branding Border */}
      <div className="border-t-[6px] border-transparent bg-primary-gradient"></div>

      {/* FEED ITEM HEADER */}
      <div className={`p-6 border-b flex-shrink-0 ${isNewNote ? 'bg-indigo-50/40 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
        
        {/* Practitioner Info & Status */}
        <div 
          className={`flex justify-between items-start pb-5 border-b border-slate-200/70 ${!isNewNote ? 'cursor-pointer hover:bg-slate-100/50 -mx-6 px-6 pt-5 -mt-5 transition-colors' : 'mb-5'}`}
          onClick={() => !isNewNote && onToggleExpand?.()}
        >
          <div className="flex items-center gap-3.5">
            {practitionerAvatar ? (
              <img src={practitionerAvatar} alt={practitionerName} className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm ring-2 ring-white" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary-gradient flex items-center justify-center text-white font-bold border border-white shadow-sm ring-2 ring-white text-lg">
                {practitionerName.charAt(0)}
              </div>
            )}
            <div>
              <h4 className="text-base font-bold text-slate-800 tracking-tight">{practitionerName}</h4>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-0.5">{clinicBranchName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isNewNote && note && (
              <div className="flex items-center gap-2 mr-2">
                {note.status === 'finalized' ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Finalized/Signed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                    Drafted
                  </span>
                )}
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-500">{formatDate(note.created_at)}</span>
              </div>
            )}
            
            {!isNewNote && note && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrintModal(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Print Note"
                >
                  <Printer className="w-4 h-4" />
                </button>
                {note.status === 'drafted' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditorContext({ type: 'EDIT_NOTE', noteId: note.id });
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                    title="Edit Note"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmailModal(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Send via Email"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditorContext({ type: 'COPY_NOTE', sourceNoteId: note.id });
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Copy to Current Notes"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </>
            )}
            {isNewNote && (
              <button 
                onClick={onCancelNewNote}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            
            {!isNewNote && (
              <button 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors ml-2"
                title={isExpanded ? "Collapse Note" : "Expand Note"}
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Note Metadata Details */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 pt-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Session (Appointment)</label>
            {isReadOnly ? (
              <p className="text-sm font-medium text-slate-800">
                {appt ? (
                  <>
                    {formatDate(appt.date)} — {formatTime(appt.start_time)} — {appt.service_name}
                    {appt.case_session_number && (
                      <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md ml-2 border border-sky-200 inline-block">
                        {appt.case_session_number}{appt.case_approved_sessions ? `/${appt.case_approved_sessions}` : ''} Session
                      </span>
                    )}
                  </>
                ) : 'No Session Linked'}
              </p>
            ) : (
              <select
                value={selectedAppointment || ''}
                onChange={(e) => setSelectedAppointment(Number(e.target.value))}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select Appointment</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDate(a.date)} — {formatTime(a.start_time)} — {a.practitioner_name} — {a.service_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date</label>
            {isReadOnly ? (
              <p className="text-sm font-medium text-slate-800">{formatDate(noteDate)}</p>
            ) : (
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            )}
          </div>
          
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Clinical Note Template</label>
            {isReadOnly ? (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-900">{selectedTemplate?.name || 'N/A'}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                  className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select Template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  onClick={handleLoadTemplate}
                  disabled={!selectedTemplateId || selectedTemplate?.id === selectedTemplateId}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
                >
                  Load
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* FEED ITEM EDITOR */}
      {isExpanded && (
      <div className="p-6">
        {selectedTemplate ? (
          <DynamicFormRenderer
            sections={selectedTemplate.structure?.sections || []}
            values={content}
            onChange={(fieldId, val) => setContent(prev => ({ ...prev, [fieldId]: val }))}
            disabled={isReadOnly}
          />
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400">
            <FileText className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Select and load a template to begin documentation</p>
          </div>
        )}
      </div>
      )}

      {/* FEED ITEM ACTIONS & FOOTER */}
      {isExpanded && !isReadOnly && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
          <span className="text-xs text-slate-400">Generated by Malasakit Systems</span>
          <div className="flex justify-end gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !selectedTemplate}
              className="px-5 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !selectedTemplate}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Finalize / Sign
            </button>
          </div>
        </div>
      )}
      {isExpanded && isReadOnly && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-400 flex-shrink-0">
          <span>Generated by Malasakit Systems</span>
          {note?.status === 'finalized' && note.signed_at && <span>Signed on {formatDate(note.signed_at)}</span>}
        </div>
      )}
      
      {/* Modals */}
      {showPrintModal && note && (
        <PrintNoteModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          note={note}
          template={selectedTemplate}
          appointment={appointments.find(a => a.id === note.appointment)}
          patientName={patient ? `${patient.first_name} ${patient.last_name}` : ''}
          clinicName={clinicProfile?.name}
          clinicLogoUrl={clinicProfile?.logo_url ?? undefined}
        />
      )}
      {showEmailModal && note && (
        <SendNoteEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          note={note}
          template={selectedTemplate}
          appointment={appointments.find(a => a.id === note.appointment)}
          patientName={patient ? `${patient.first_name} ${patient.last_name}` : ''}
          patientEmail={patient?.email || ''}
          clinicName={clinicProfile?.name}
          clinicLogoUrl={clinicProfile?.logo_url ?? undefined}
        />
      )}
    </div>
  );
};
