import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import { ClinicalWorkspaceProvider, useClinicalWorkspace } from './context/ClinicalWorkspaceContext';
import { WorkspaceTemplatesPanel } from './components/WorkspaceTemplatesPanel';
import { WorkspaceRightPanel } from './components/WorkspaceRightPanel';
import { CreateClinicalNoteModal } from '@/features/clinical-template/components/CreateClinicalNoteModal';

const ClinicalWorkspaceLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cases, patient } = usePatientProfileContext();
  const { selectedCaseId, setSelectedCaseId, editorContext, setEditorContext, triggerRefresh } = useClinicalWorkspace();

  // Auto-select case on mount or location state
  useEffect(() => {
    if (location.state?.caseId && cases.some((c) => c.id === location.state.caseId)) {
      setSelectedCaseId(location.state.caseId);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (cases.length > 0 && selectedCaseId === null) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, location.state?.caseId, location.pathname, navigate, selectedCaseId, setSelectedCaseId]);


  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50/50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Clinical Documentation Workspace</h1>
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
          isOpen={editorContext.type === 'NEW_NOTE'}
          onClose={() => setEditorContext({ type: 'IDLE' })}
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          patientCaseId={selectedCaseId || undefined}
          preselectedTemplateId={editorContext.type === 'NEW_NOTE' ? editorContext.templateId : undefined}
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
  const location = useLocation();
  return (
    <ClinicalWorkspaceProvider initialCaseId={location.state?.caseId}>
      <ClinicalWorkspaceLayout />
    </ClinicalWorkspaceProvider>
  );
};

export default ClinicalDocumentationWorkspace;
