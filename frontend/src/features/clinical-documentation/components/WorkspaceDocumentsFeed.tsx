import React from 'react';
import { Files, Calendar, ShieldCheck, FileCheck, FileText, Download } from 'lucide-react';
import type { CaseDocument } from '../api/caseDocuments.api';
import type { PatientConsentDocumentRecord } from '@/features/patients/patient.api';
import type { Appointment } from '@/types';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { ViewConsentFormModal } from '@/features/patients/components/ViewConsentFormModal';

interface WorkspaceDocumentsFeedProps {
  documents: (CaseDocument | (PatientConsentDocumentRecord & { category: string, description?: string }))[];
  appointments: Appointment[];
  onDeleteSuccess?: () => void;
}

export const WorkspaceDocumentsFeed: React.FC<WorkspaceDocumentsFeedProps> = ({ documents, appointments, onDeleteSuccess }) => {
  const { setEditorContext } = useClinicalWorkspace();
  const [viewingConsent, setViewingConsent] = React.useState<PatientConsentDocumentRecord | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<CaseDocument | null>(null);

  if (documents.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
        <Files className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">No Documents Found</h3>
        <p className="text-sm">There are no uploaded files, consent forms, or attachments for this case.</p>
      </div>
    );
  }

  // Group by appointment. Unassigned docs go to 'unassigned'
  const groupedDocs: Record<string, typeof documents> = {};
  const unassigned: typeof documents = [];

  documents.forEach((doc) => {
    let apptId: number | null = null;
    if ('appointment_id' in doc && doc.appointment_id) {
      apptId = doc.appointment_id;
    }

    if (apptId) {
      const key = String(apptId);
      if (!groupedDocs[key]) groupedDocs[key] = [];
      groupedDocs[key].push(doc);
    } else {
      unassigned.push(doc);
    }
  });

  const getAppointmentDetails = (idStr: string) => {
    const id = parseInt(idStr, 10);
    return appointments.find(a => a.id === id);
  };

  const renderDocCard = (doc: any) => {
    const isConsent = 'consent_document_name' in doc;
    const type = isConsent ? 'consent' : 'case';
    
    return (
      <div 
        key={doc.id} 
        className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors flex items-center justify-between group"
      >
        <div 
          onClick={(e) => {
            if (type === 'case') {
              e.preventDefault();
              setPreviewDoc(doc as CaseDocument);
            } else {
              setViewingConsent(doc as PatientConsentDocumentRecord);
            }
          }}
          className="flex-1 min-w-0 cursor-pointer flex items-center gap-4"
        >
          <div className={`p-2 rounded-lg shrink-0 ${isConsent ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {isConsent ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 truncate">
              {isConsent ? doc.consent_document_name : doc.title}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              {isConsent && (
                <>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700">
                    Consent Form
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{new Date(doc.created_at || doc.signed_at).toLocaleDateString()}</span>
            </p>
          </div>
        </div>
        <a 
          href={type === 'case' ? doc.file : doc.signed_document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0 ml-2"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  };

  const sortedGroups = Object.keys(groupedDocs).sort((a, b) => {
    const apptA = getAppointmentDetails(a);
    const apptB = getAppointmentDetails(b);
    if (!apptA || !apptB) return 0;
    return new Date(apptB.date).getTime() - new Date(apptA.date).getTime();
  });

  return (
    <div className="space-y-8">
      {sortedGroups.map(apptId => {
        const appt = getAppointmentDetails(apptId);
        const docs = groupedDocs[apptId];
        return (
          <div key={apptId} className="space-y-4 relative pl-4 border-l-2 border-indigo-100">
            <div className="flex items-center gap-2 mb-4 -ml-[25px] bg-slate-50 py-1 pr-4 rounded-r-full max-w-max">
              <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-50 shadow-sm" />
              {appt ? (
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Appointment: {new Date(appt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span className="text-slate-400">•</span>
                  {appt.start_time}
                  {appt.case_session_number && (
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md ml-1 border border-sky-200">
                      {appt.case_session_number}{appt.case_approved_sessions ? `/${appt.case_approved_sessions}` : ''} Session
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-sm font-medium text-slate-700">Unknown Session</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map(renderDocCard)}
            </div>
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Files className="w-4 h-4" />
            Case Level Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unassigned.map(renderDocCard)}
          </div>
        </div>
      )}

      {viewingConsent && (
        <ViewConsentFormModal
          isOpen={true}
          consent={viewingConsent}
          onClose={() => setViewingConsent(null)}
          onSendEmail={() => {}}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal 
          document={previewDoc} 
          onClose={() => setPreviewDoc(null)} 
          onDeleteSuccess={() => {
            setPreviewDoc(null);
            if (onDeleteSuccess) onDeleteSuccess();
          }}
        />
      )}
    </div>
  );
};
