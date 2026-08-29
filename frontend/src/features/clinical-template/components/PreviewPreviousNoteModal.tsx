import React, { useMemo } from 'react';
import { X, Calendar, User, FileText, CheckCircle2, History } from 'lucide-react';
import type { ClinicalNote } from '@/types/clinicalTemplate';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import type { PatientCase } from '@/types/patient';

interface PreviewPreviousNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNote: ClinicalNote;
  templateStructure: any; // The structure from the ClinicalTemplate
  sourceNoteCaseTitle?: string;
  onCopy: (reconstructedContent: Record<string, unknown>) => void;
  allNotes?: ClinicalNote[];
  onSelectNote?: (note: ClinicalNote) => void;
  patientCases?: PatientCase[];
}

export const PreviewPreviousNoteModal: React.FC<PreviewPreviousNoteModalProps> = ({
  isOpen,
  onClose,
  sourceNote,
  templateStructure,
  sourceNoteCaseTitle,
  onCopy,
  allNotes = [],
  onSelectNote,
  patientCases = [],
}) => {
  // Pre-process the content to merge chart annotations before passing to renderer
  // and before copying to ensure the destination note has the full objects
  const renderValues = useMemo(() => {
    if (!sourceNote || !sourceNote.decrypted_content) return {};
    
    // Deep copy content so we don't mutate the state directly
    const contentCopy = JSON.parse(JSON.stringify(sourceNote.decrypted_content));
    
    // Reconstruct chart objects
    if (sourceNote.chart_annotation_data) {
      Object.entries(sourceNote.chart_annotation_data).forEach(([fieldId, annotationData]: [string, any]) => {
        if (contentCopy[fieldId] && typeof contentCopy[fieldId] === 'string') {
          contentCopy[fieldId] = {
            canvas_image: contentCopy[fieldId],
            doodle_data: annotationData.doodle_data || [],
            chart_type: annotationData.chart_type
          };
        }
      });
    }
    return contentCopy;
  }, [sourceNote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm sm:p-5">
      <div className="flex flex-col w-full max-w-4xl max-h-full bg-white shadow-2xl rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-xl text-indigo-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Preview Previous Session</h2>
                {allNotes.length > 0 && onSelectNote && (
                  <select
                    value={sourceNote.id}
                    onChange={(e) => {
                      const note = allNotes.find(n => n.id === Number(e.target.value));
                      if (note) onSelectNote(note);
                    }}
                    className="text-sm border border-gray-200 rounded-lg py-1 px-2 focus:ring-sky-500 focus:border-sky-500 max-w-[250px]"
                  >
                    {allNotes.map(note => {
                      let caseName = 'No Case';
                      let caseId = note.patient_case || note.patient_case_id;

                      if (caseId) {
                        const c = patientCases.find(pc => pc.id === caseId);
                        if (c) caseName = c.title;
                      }
                      
                      const d = note.appointment_date ? new Date(note.appointment_date) : new Date(note.date);
                      return (
                        <option key={note.id} value={note.id}>
                          {d.toLocaleDateString()} — {caseName}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">Review content before copying to current note</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 overflow-y-auto custom-scrollbar bg-gray-50/50">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* Metadata Card */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Appointment Date
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sourceNote.appointment_date ? new Date(sourceNote.appointment_date).toLocaleDateString() : sourceNote.date}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    <User className="w-3.5 h-3.5" />
                    Practitioner
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sourceNote.practitioner_name}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    Case
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sourceNoteCaseTitle || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    Template
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sourceNote.template_name || 'Custom'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Status
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sourceNote.status === 'finalized' ? 'Signed & Locked' : 'Drafted'}
                  </div>
                </div>
              </div>
            </div>

            {/* Read-only Content Preview */}
            <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
              {templateStructure && templateStructure.sections ? (
                <div className="pointer-events-none opacity-90">
                  <DynamicFormRenderer
                    sections={templateStructure.sections}
                    values={renderValues}
                    onChange={() => {}} // Read-only
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 mb-3 text-gray-300" />
                  <h3 className="text-sm font-medium text-gray-900">No template structure</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Cannot preview this note because the template structure is missing.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-white border-t border-gray-100 gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onCopy(renderValues)}
            disabled={!templateStructure}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            Copy to Current Note
          </button>
        </div>
      </div>
    </div>
  );
};
