import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, FileText, Plus, Navigation } from 'lucide-react';
import { getActiveLetterTemplates, type LetterTemplate } from '../api/letterTemplates.api';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileCheck } from 'lucide-react';
import { 
  createConsentDocument, 
  getPatientConsentDocuments,
  type PatientConsentDocumentRecord 
} from '@/features/patients/patient.api';
import { getActiveClinicConsentForm, type ClinicConsentFormResponse } from '@/features/clinics/clinic.api';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import { ConsentFormModal } from '@/features/patient-portal/components/ConsentFormModal';
import { ClinicConsentFormViewer } from '@/features/patient-portal/components/ClinicConsentFormViewer';
import { ViewConsentFormModal } from '@/features/patients/components/ViewConsentFormModal';
import toast from 'react-hot-toast';

export const WorkspaceLettersPanel = () => {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { setEditorContext, selectedCaseId, triggerRefresh } = useClinicalWorkspace();
  const navigate = useNavigate();
  const { patient } = usePatientProfileContext();
  
  const [patientDocuments, setPatientDocuments] = useState<PatientConsentDocumentRecord[]>([]);
  const [activeCcfConfig, setActiveCcfConfig] = useState<ClinicConsentFormResponse | null>(null);
  const [ccfConfigLoading, setCcfConfigLoading] = useState(true);

  // Modals state
  const [isDpfModalOpen, setIsDpfModalOpen] = useState(false);
  const [isCcfModalOpen, setIsCcfModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<PatientConsentDocumentRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [templateData, ccfConfigData] = await Promise.all([
          getActiveLetterTemplates(),
          getActiveClinicConsentForm().catch(() => null)
        ]);
        if (!cancelled) {
          setTemplates(templateData);
          setActiveCcfConfig(ccfConfigData);
          setCcfConfigLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch initial letters data', err);
        if (!cancelled) setCcfConfigLoading(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!patient || !selectedCaseId) return;
    let cancelled = false;
    getPatientConsentDocuments(patient.id)
      .then(docs => {
        if (!cancelled) {
          setPatientDocuments(docs.filter(d => d.patient_case_id === selectedCaseId));
        }
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [patient, selectedCaseId]);

  const existingDpf = useMemo(() => patientDocuments.find(d => d.type === 'DATA_PRIVACY_CONSENT'), [patientDocuments]);
  const existingCcf = useMemo(() => patientDocuments.find(d => d.type === 'CLINIC_CONSENT'), [patientDocuments]);

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(filteredTemplates.map(t => t.category).filter(Boolean)));

  const handleSaveConsent = async (type: string, title: string, signature: string, text: string, headerHtml: string = '') => {
    if (!patient || !selectedCaseId) return;
    try {
      const newDoc = await createConsentDocument(patient.id, {
        title,
        header_snapshot: headerHtml,
        body_snapshot: text,
        signature,
        consent_version: 'v1.0',
        signer_full_name: patient.first_name + ' ' + patient.last_name,
        signer_email: patient.email || 'no-email@example.com',
        type,
        patient_case_id: selectedCaseId,
      });
      setPatientDocuments(prev => [newDoc, ...prev]);
      triggerRefresh();
      toast.success(`${title} generated successfully.`);
    } catch (err: any) {
      console.error('Failed to create consent document', err);
      toast.error(err.response?.data?.error || "Failed to generate document.");
    }
  };



  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading templates...</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">No Letter Templates Found</h3>
        <p className="text-xs text-slate-500 mb-4">You haven't created any letter templates yet.</p>
        <button
          onClick={() => navigate('/manage', { state: { activeCategory: 'clinical', activeItem: 'letter_templates' } })}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* System Forms (Consent) */}
        <div className="mb-6">
          <div className="flex items-center gap-3 px-2 mb-2">
            <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              SYSTEM FORMS
            </h4>
            <div className="h-px flex-1 bg-slate-200/60" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {/* DPF Button */}
            <button
              onClick={() => {
                if (!patient || !selectedCaseId) {
                  toast.error("Please select a case and ensure patient is loaded.");
                  return;
                }
                if (existingDpf) setViewingDocument(existingDpf);
                else setIsDpfModalOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-indigo-50 group transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-900 truncate">
                  Data Privacy Form
                </p>
                <p className={`text-xs truncate ${existingDpf ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                  {existingDpf ? '✓ Completed' : 'Not completed'}
                </p>
              </div>
              <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
            </button>

            {/* CCF Button */}
            <button
              onClick={() => {
                if (!patient || !selectedCaseId) {
                  toast.error("Please select a case and ensure patient is loaded.");
                  return;
                }
                if (existingCcf) setViewingDocument(existingCcf);
                else setIsCcfModalOpen(true);
              }}
              disabled={!activeCcfConfig && !existingCcf}
              className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-indigo-50 group transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                <FileCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-900 truncate">
                  Clinic Consent Form
                </p>
                <p className={`text-xs truncate ${existingCcf ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                  {existingCcf ? '✓ Completed' : (!activeCcfConfig && !ccfConfigLoading ? 'Not configured' : 'Not completed')}
                </p>
              </div>
              <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-emerald-500 transition-all" />
            </button>
          </div>
        </div>

        {categories.length === 0 && searchTerm && (
          <div className="text-center py-10 text-slate-400 text-sm">
            No templates match your search.
          </div>
        )}
        
        {categories.map((category) => (
          <div key={category} className="mb-4 last:mb-0">
            <div className="flex items-center gap-3 px-2 mb-2">
              <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {category}
              </h4>
              <div className="h-px flex-1 bg-slate-200/60" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              {filteredTemplates
                .filter(t => t.category === category)
                .map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      if (!selectedCaseId) {
                        alert("Assign a Case first to create clinical documentation.");
                        return;
                      }
                      setEditorContext({ type: 'NEW_LETTER', templateId: template.id });
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left bg-emerald-50/50 hover:bg-emerald-100/50 border border-emerald-100 hover:border-emerald-200 group transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center shrink-0 group-hover:bg-emerald-200/50 transition-colors">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-900 truncate">
                        {template.name}
                      </p>
                      {template.description && (
                        <p className="text-xs text-slate-500 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-emerald-300 opacity-0 group-hover:opacity-100 group-hover:text-emerald-600 transition-all" />
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {patient && (
        <ConsentFormModal 
          isOpen={isDpfModalOpen}
          patientFullName={patient.first_name + ' ' + patient.last_name}
          patientEmail={patient.email || ''}
          onClose={() => setIsDpfModalOpen(false)}
          onSigned={(sig, text) => handleSaveConsent('DATA_PRIVACY_CONSENT', 'Data Privacy Consent Form', sig, text)}
        />
      )}

      {patient && activeCcfConfig && (
        <ClinicConsentFormViewer
          isOpen={isCcfModalOpen}
          clinicName={activeCcfConfig.clinic_name || 'Clinic'}
          title={activeCcfConfig.title}
          headerContent={activeCcfConfig.header_content}
          bodyContent={activeCcfConfig.body_content}
          patientFullName={patient.first_name + ' ' + patient.last_name}
          patientEmail={patient.email || ''}
          onClose={() => setIsCcfModalOpen(false)}
          onSigned={(sig) => handleSaveConsent('CLINIC_CONSENT', activeCcfConfig.title, sig, activeCcfConfig.body_content, activeCcfConfig.header_content)}
        />
      )}

      {viewingDocument && (
        <ViewConsentFormModal
          isOpen={!!viewingDocument}
          consent={viewingDocument}
          onClose={() => setViewingDocument(null)}
          onSendEmail={() => toast('Email functionality not yet linked in workspace', { icon: 'ℹ️' })}
        />
      )}
    </div>
  );
};
