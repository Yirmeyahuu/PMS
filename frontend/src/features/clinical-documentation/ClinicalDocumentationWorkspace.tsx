import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import { ClinicalWorkspaceProvider, useClinicalWorkspace } from './context/ClinicalWorkspaceContext';
import { WorkspaceTemplatesPanel } from './components/WorkspaceTemplatesPanel';
import { WorkspaceRightPanel } from './components/WorkspaceRightPanel';
import { CreateClinicalNoteModal } from '@/features/clinical-template/components/CreateClinicalNoteModal';

const ClinicalWorkspaceLayout = () => {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const { cases, patient } = usePatientProfileContext();
  const { selectedCaseId, setSelectedCaseId, editorContext, setEditorContext, triggerRefresh } = useClinicalWorkspace();
  const location = useLocation();
  const state = location.state as { appointmentId?: number } | null;

  const currentCase = cases.find(c => c.id === Number(caseId));

  // Sync context with URL caseId
  useEffect(() => {
    if (caseId && Number(caseId) !== selectedCaseId) {
      setSelectedCaseId(Number(caseId));
    }
  }, [caseId, selectedCaseId, setSelectedCaseId]);


  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50/50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0 flex items-center gap-2">
        <button 
          onClick={() => navigate(`/patients/${patient?.id}/cases`)}
          className="text-gray-500 hover:text-gray-700"
        >
          Clinical Notes
        </button>
        <span className="text-gray-400">»</span>
        <h1 className="text-xl font-bold text-slate-900">
          {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'} 
          {currentCase && <span className="text-sky-600 font-medium ml-2">({currentCase.title})</span>}
        </h1>
      </div>

      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-12 gap-4 p-4">
          {/* Left Panel: Templates */}
          <div className="col-span-12 md:col-span-5 lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex-shrink-0">Templates</div>
            <div className="flex-1 overflow-y-auto">
              <WorkspaceTemplatesPanel />
            </div>
          </div>

          {/* Right Panel: History / Documents */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <WorkspaceRightPanel />
          </div>
        </div>
      </div>

      {patient && (
        <CreateClinicalNoteModal
          isOpen={editorContext.type === 'NEW_NOTE' || editorContext.type === 'COPY_NOTE'}
          onClose={() => setEditorContext({ type: 'IDLE' })}
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          patientCaseId={selectedCaseId || undefined}
          appointmentId={state?.appointmentId}
          preselectedTemplateId={editorContext.type === 'NEW_NOTE' ? editorContext.templateId : undefined}
          copyFromNoteId={editorContext.type === 'COPY_NOTE' ? editorContext.sourceNoteId : undefined}
          onSuccess={() => {
            setEditorContext({ type: 'IDLE' });
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
};

export const ClinicalDocumentationWorkspace = () => {
  const { caseId } = useParams();
  return (
    <ClinicalWorkspaceProvider initialCaseId={caseId ? Number(caseId) : undefined}>
      <ClinicalWorkspaceLayout />
    </ClinicalWorkspaceProvider>
  );
};

export default ClinicalDocumentationWorkspace;
