import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import { ClinicalWorkspaceProvider, useClinicalWorkspace } from './context/ClinicalWorkspaceContext';
import { WorkspaceTemplatesPanel } from './components/WorkspaceTemplatesPanel';
import { WorkspaceRightPanel } from './components/WorkspaceRightPanel';
import { WorkspaceLettersPanel } from './components/WorkspaceLettersPanel';
import { ClinicalNoteEditor } from './components/ClinicalNoteEditor';
import { GenerateLetterModal } from './components/GenerateLetterModal';

const ClinicalWorkspaceLayout = () => {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const { cases, patient } = usePatientProfileContext();
  const { selectedCaseId, setSelectedCaseId, editorContext, setEditorContext, triggerRefresh, activeLeftTab, setActiveLeftTab } = useClinicalWorkspace();
  const location = useLocation();
  const state = location.state as { appointmentId?: number } | null;

  const currentCase = cases.find(c => c.id === Number(caseId));

  // Sync context with URL caseId
  useEffect(() => {
    if (caseId && Number(caseId) !== selectedCaseId) {
      setSelectedCaseId(Number(caseId));
    }
  }, [caseId, selectedCaseId, setSelectedCaseId]);


  const isEditorActive = editorContext.type === 'NEW_NOTE' || editorContext.type === 'COPY_NOTE';

  return (
    <div className="h-[calc(100vh-88px)] w-full flex flex-col bg-slate-50/50 overflow-hidden rounded-2xl">
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

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 p-4">
          {/* Left Panel: Templates / Letters / Editor */}
          <div className="w-full md:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 transition-all duration-300">
            {isEditorActive ? (
              <ClinicalNoteEditor />
            ) : (
              <>
                {/* Left Panel Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto hide-scrollbar flex-shrink-0">
                  <button
                    onClick={() => setActiveLeftTab('templates')}
                    className={`flex-1 min-w-[100px] py-2.5 text-sm font-semibold transition-colors ${
                      activeLeftTab === 'templates' ? 'bg-white border-t-2 border-t-sky-600 text-sky-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Templates
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('letters')}
                    className={`flex-1 min-w-[100px] py-2.5 text-sm font-semibold transition-colors ${
                      activeLeftTab === 'letters' ? 'bg-white border-t-2 border-t-sky-600 text-sky-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Letters
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {activeLeftTab === 'templates' ? <WorkspaceTemplatesPanel /> : <WorkspaceLettersPanel />}
                </div>
              </>
            )}
          </div>

          {/* Right Panel: Content Feed */}
          <div className="w-full md:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 transition-all duration-300">
            <WorkspaceRightPanel />
          </div>
        </div>
      </div>


      {patient && editorContext.type === 'NEW_LETTER' && (
        <GenerateLetterModal
          patientId={patient.id}
          preSelectedTemplateId={editorContext.templateId}
          preSelectedCaseId={selectedCaseId || undefined}
          appointmentId={state?.appointmentId}
          onClose={() => setEditorContext({ type: 'IDLE' })}
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
