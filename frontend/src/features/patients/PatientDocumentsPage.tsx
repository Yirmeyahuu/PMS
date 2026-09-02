import { useState, useEffect, useCallback, useMemo } from 'react';
import { Files, ChevronDown, ChevronUp, Folder, Plus, Loader2, FileText, ShieldCheck, Download } from 'lucide-react';
import { usePatientProfileContext } from './context/PatientProfileContext';
import { getCaseDocuments, type CaseDocument } from '@/features/clinical-documentation/api/caseDocuments.api';
import { getPatientConsentDocuments, type PatientConsentDocumentRecord } from './patient.api';
import { UploadDocumentModal } from '@/features/clinical-documentation/components/UploadDocumentModal';
import { DocumentPreviewModal } from '@/features/clinical-documentation/components/DocumentPreviewModal';
import { ViewConsentFormModal } from './components/ViewConsentFormModal';

export const PatientDocumentsPage = () => {
  const { patient, cases, appointments } = usePatientProfileContext();

  const [documents, setDocuments] = useState<(CaseDocument | (PatientConsentDocumentRecord & { category: string }))[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCases, setExpandedCases] = useState<Set<number | 'unassigned'>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<CaseDocument | null>(null);
  const [viewingConsent, setViewingConsent] = useState<PatientConsentDocumentRecord | null>(null);

  const fetchData = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const [docsData, consentDocsData] = await Promise.all([
        getCaseDocuments(patient.id),
        getPatientConsentDocuments(patient.id)
      ]);

      const filteredDocs = docsData || [];
      const rawConsentDocs = consentDocsData || [];

      // Deduplicate consent docs by type and appointment (keep latest signed_at)
      const uniqueConsentDocsMap = new Map();
      rawConsentDocs.forEach(doc => {
        const apptId = doc.appointment_id || doc.appointment || 'no-appt';
        const key = `${doc.type}-${apptId}`;
        const existing = uniqueConsentDocsMap.get(key);
        if (!existing || new Date(doc.signed_at).getTime() > new Date(existing.signed_at).getTime()) {
          uniqueConsentDocsMap.set(key, doc);
        }
      });
      const filteredConsentDocs = Array.from(uniqueConsentDocsMap.values());

      const mappedConsentDocs = filteredConsentDocs.map(doc => ({
        ...doc,
        id: `consent-${doc.id}`,
        title: doc.type === 'DATA_PRIVACY_CONSENT' ? 'Data Privacy Form' : 'Clinic Consent Form',
        category: 'CONSENT_FORM',
      }));
      
      setDocuments([...filteredDocs, ...mappedConsentDocs]);
    } catch (error) {
      console.error('Failed to fetch patient documents', error);
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map appointments to their respective case ID
  const appointmentCaseMap = useMemo(() => {
    const map = new Map<number, number>();
    appointments.forEach(appt => {
      const caseId = appt.patient_case || (appt as any).patient_case?.id;
      if (caseId) {
        map.set(appt.id, caseId);
      }
    });
    return map;
  }, [appointments]);

  // Group documents by Case ID
  const groupedDocs = useMemo(() => {
    const groups: Record<number, typeof documents> = {};
    const unassigned: typeof documents = [];

    documents.forEach((doc) => {
      let caseId: number | null = null;
      
      if ('patient_case' in doc && doc.patient_case) {
        // Normal CaseDocument
        caseId = doc.patient_case;
      } else if ('appointment_id' in doc || 'appointment' in doc) {
        // ConsentDocument mapped via appointment
        const apptId = (doc as any).appointment_id || (doc as any).appointment;
        if (apptId && appointmentCaseMap.has(apptId)) {
          caseId = appointmentCaseMap.get(apptId)!;
        }
      }

      if (caseId && cases.some(c => c.id === caseId)) {
        if (!groups[caseId]) groups[caseId] = [];
        groups[caseId].push(doc);
      } else {
        unassigned.push(doc);
      }
    });

    // Sort documents within groups by date (newest first)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        const dateA = new Date((a as any).created_at || (a as any).signed_at).getTime();
        const dateB = new Date((b as any).created_at || (b as any).signed_at).getTime();
        return dateB - dateA;
      });
    });

    unassigned.sort((a, b) => {
      const dateA = new Date((a as any).created_at || (a as any).signed_at).getTime();
      const dateB = new Date((b as any).created_at || (b as any).signed_at).getTime();
      return dateB - dateA;
    });

    return { groups, unassigned };
  }, [documents, cases, appointmentCaseMap]);

  const toggleCase = (caseId: number | 'unassigned') => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  const renderDocRow = (doc: any) => {
    const isConsent = 'consent_document_name' in doc;
    const type = isConsent ? 'consent' : 'case';
    
    // Size formatting
    let sizeStr = '';
    if (!isConsent && doc.file_size) {
      if (doc.file_size < 1024 * 1024) {
        sizeStr = `${Math.round(doc.file_size / 1024)} KB`;
      } else {
        sizeStr = `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`;
      }
    }
    
    // Ext
    let extStr = '';
    if (!isConsent && doc.file_name) {
      const parts = doc.file_name.split('.');
      if (parts.length > 1) {
        extStr = parts.pop().toUpperCase();
      }
    }

    return (
      <div 
        key={doc.id} 
        className="flex items-center justify-between p-3 pl-12 pr-4 border-t border-slate-100 hover:bg-slate-50 transition-colors group cursor-pointer"
        onClick={(e) => {
          if (type === 'case') {
            e.preventDefault();
            setPreviewDoc(doc as CaseDocument);
          } else {
            setViewingConsent(doc as PatientConsentDocumentRecord);
          }
        }}
      >
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${isConsent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            {isConsent ? <ShieldCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {isConsent ? doc.consent_document_name : doc.title}
              </h4>
              {sizeStr && <span className="text-xs font-medium text-slate-500 shrink-0">{sizeStr}</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              {isConsent && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                  Consent Form
                </span>
              )}
              {extStr && !isConsent && (
                <span className="font-medium text-slate-600">{extStr}</span>
              )}
              {extStr && !isConsent && <span className="text-slate-300">•</span>}
              <span>Uploaded {new Date(doc.created_at || doc.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {doc.uploaded_by_name && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>by {doc.uploaded_by_name}</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <a 
          href={type === 'case' ? doc.file : doc.signed_document_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-4 p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors shrink-0"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  };

  const sortedCases = [...cases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <div className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-heading text-gray-900">Documents</h1>
            <p className="text-sm text-gray-500 mt-1">Manage files and consent forms across cases</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Documents
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12 bg-white rounded-2xl border border-gray-200">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {sortedCases.map(c => {
              const caseDocs = groupedDocs.groups[c.id] || [];
              const isExpanded = expandedCases.has(c.id);
              
              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCase(c.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-sky-500 fill-sky-100" />
                      <h3 className="text-base font-semibold text-slate-900">{c.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span>{caseDocs.length} Document{caseDocs.length !== 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-white">
                      {caseDocs.length > 0 ? (
                        caseDocs.map(renderDocRow)
                      ) : (
                        <div className="p-6 text-center text-slate-500 text-sm bg-slate-50/50 border-t border-slate-100">
                          No documents uploaded for this case.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {groupedDocs.unassigned.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleCase('unassigned')}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5 text-slate-400 fill-slate-100" />
                    <h3 className="text-base font-semibold text-slate-700">Unassigned Documents</h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{groupedDocs.unassigned.length} Document{groupedDocs.unassigned.length !== 1 ? 's' : ''}</span>
                    {expandedCases.has('unassigned') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                
                {expandedCases.has('unassigned') && (
                  <div className="bg-white">
                    {groupedDocs.unassigned.map(renderDocRow)}
                  </div>
                )}
              </div>
            )}

            {sortedCases.length === 0 && groupedDocs.unassigned.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <Files className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No documents found</h3>
                <p className="text-sm text-slate-500">No documents have been uploaded for this patient yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showUploadModal && patient && (
        <UploadDocumentModal
          patientId={patient.id}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchData();
          }}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal 
          document={previewDoc} 
          onClose={() => setPreviewDoc(null)} 
          onDeleteSuccess={() => {
            setPreviewDoc(null);
            fetchData();
          }}
        />
      )}

      {viewingConsent && (
        <ViewConsentFormModal
          isOpen={true}
          consent={viewingConsent}
          onClose={() => setViewingConsent(null)}
          onSendEmail={() => {}}
        />
      )}
    </>
  );
};
