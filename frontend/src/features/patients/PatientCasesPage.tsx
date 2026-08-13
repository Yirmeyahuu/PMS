import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Clock, FileText, CheckCircle, Search } from 'lucide-react';
import { usePatientProfileContext } from './context/PatientProfileContext';
import { CaseModal } from './CaseModal';
import type { PatientCaseStatus } from '@/types/patient';
import toast from 'react-hot-toast';
import { usePractitioners } from '@/features/clinics/hooks/usePractitioners';
import { createPatientCase } from './patientCases.api';
import { ArchiveCaseModal } from './ArchiveCaseModal';
import { HardDeleteCaseModal } from './HardDeleteCaseModal';
import { restorePatientCase } from './patientCases.api';

export const PatientCasesPage = () => {
  const { patient, cases, refreshCases } = usePatientProfileContext();
  const navigate = useNavigate();
  
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | PatientCaseStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  
  const [caseToEdit, setCaseToEdit] = useState<any>(null);
  const [isEditCaseOpen, setIsEditCaseOpen] = useState(false);
  
  const [caseToArchive, setCaseToArchive] = useState<any>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  
  const [caseToHardDelete, setCaseToHardDelete] = useState<any>(null);
  const [isHardDeleteOpen, setIsHardDeleteOpen] = useState(false);
  
  const { practitioners, loading: loadingPractitioners } = usePractitioners({});

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const isArchived = Boolean(c.is_archived);
      if (viewMode === 'ACTIVE' && isArchived) return false;
      if (viewMode === 'ARCHIVED' && !isArchived) return false;
      
      const matchesFilter = filter === 'ALL' || c.status === filter;
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [cases, filter, searchQuery, viewMode]);

  const getStatusColor = (status: PatientCaseStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'MONITORING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DISCHARGED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCaseClick = (caseId: number) => {
    // Navigate to the Clinical Documentation Workspace for this case
    navigate(`/patients/${patient?.id}/cases/${caseId}/clinical-documentation`);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-heading text-gray-900">Cases</h1>
              <p className="text-sm text-gray-500 mt-1">
                {patient?.full_name || 'Patient'} • {cases.length} total cases
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 p-1 rounded-xl flex items-center mr-2">
                <button 
                  onClick={() => setViewMode('ACTIVE')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'ACTIVE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Active Cases
                </button>
                <button 
                  onClick={() => setViewMode('ARCHIVED')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'ARCHIVED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Archived
                </button>
              </div>
              <button
                onClick={() => setIsCreateCaseOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Case
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              {(['ALL', 'OPEN', 'MONITORING', 'DISCHARGED', 'CLOSED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    filter === status
                      ? 'bg-sky-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-sky-500 focus:border-sky-500 w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Cases Grid */}
        {filteredCases.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {viewMode === 'ARCHIVED' ? 'No Archived cases found' : 'No cases found'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery 
                ? 'Try adjusting your filters or search query.' 
                : viewMode === 'ARCHIVED'
                  ? 'There are no archived cases for this patient.'
                  : 'Create a new case to start tracking episodes of care.'}
            </p>
            {!searchQuery && filter === 'ALL' && viewMode === 'ACTIVE' && (
              <button
                onClick={() => setIsCreateCaseOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-700 text-sm font-medium rounded-xl hover:bg-sky-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Case
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                onClick={() => handleCaseClick(c.id)}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-sky-700 line-clamp-1">
                    {c.title}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(c.status)}`}>
                    {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                  </span>
                </div>
                
                {c.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{c.description}</p>
                )}

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                    <span>Practitioner: <strong>{c.primary_practitioner_name || 'Unassigned'}</strong></span>
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{c.progress_text}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        c.allocation_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        c.allocation_status === 'EXHAUSTED' ? 'bg-red-100 text-red-700' :
                        'bg-sky-100 text-sky-700'
                      }`}>
                        {c.allocation_status}
                      </span>
                    </div>
                    {!c.is_unlimited && (c.effective_session_limit || c.approved_sessions) && (
                      <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5 overflow-hidden">
                        <div 
                          className={`h-1 rounded-full transition-all ${
                            (c.remaining_sessions || 0) === 0 ? 'bg-red-500' : 
                            (c.remaining_sessions || 0) <= 2 ? 'bg-amber-500' : 
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (c.completed_sessions / (c.effective_session_limit || c.approved_sessions || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600 mt-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {viewMode === 'ACTIVE' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCaseToEdit(c); setIsEditCaseOpen(true); }}
                            className="px-3 py-1.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCaseToArchive(c); setIsArchiveOpen(true); }}
                            className="px-3 py-1.5 text-amber-700 font-medium rounded-lg hover:bg-amber-50 transition-colors border border-amber-200"
                          >
                            Archive
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCaseClick(c.id); }}
                            className="px-3 py-1.5 bg-sky-50 text-sky-700 font-medium rounded-lg hover:bg-sky-100 transition-colors border border-sky-200"
                          >
                            View
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              try {
                                await restorePatientCase(c.id);
                                toast.success('Case restored successfully');
                                await refreshCases();
                              } catch(error) {
                                toast.error('Failed to restore case');
                              }
                            }}
                            className="px-3 py-1.5 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200"
                          >
                            Restore
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCaseToHardDelete(c); setIsHardDeleteOpen(true); }}
                            className="px-3 py-1.5 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors border border-red-200"
                          >
                            Delete Permanently
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CaseModal
        isOpen={isCreateCaseOpen}
        onClose={() => setIsCreateCaseOpen(false)}
        mode="create"
        onSave={async (data) => {
          if (!patient) return;
          try {
            await createPatientCase({
              patient: patient.id,
              title: data.title,
              description: data.description,
              status: data.status,
              primary_practitioner: data.primaryPractitionerId ? Number(data.primaryPractitionerId) : undefined,
              primary_practitioner_name: data.primaryPractitionerName,
              payer: data.payer,
              alert_notes: data.alertNotes,
              referred_by: data.referredBy,
              referral_info: data.referralInfo,
              session_source: data.sessionSource,
              approved_sessions: data.isUnlimited ? undefined : data.approvedSessions || undefined,
              is_unlimited: data.isUnlimited
            });
            await refreshCases();
            setIsCreateCaseOpen(false);
            toast.success('Case created successfully');
          } catch (error) {
            toast.error('Failed to create case');
          }
        }}
        practitioners={practitioners}
        loadingPractitioners={loadingPractitioners}
      />
      <CaseModal
        isOpen={isEditCaseOpen}
        onClose={() => { setIsEditCaseOpen(false); setCaseToEdit(null); }}
        mode="edit"
        initialValues={caseToEdit || undefined}
        onSave={async (data) => {
          if (!patient || !caseToEdit) return;
          try {
            const { updatePatientCase } = await import('./patientCases.api');
            await updatePatientCase(caseToEdit.id, {
              title: data.title,
              description: data.description,
              status: data.status,
              primary_practitioner: data.primaryPractitionerId ? Number(data.primaryPractitionerId) : undefined,
              primary_practitioner_name: data.primaryPractitionerName,
              payer: data.payer,
              alert_notes: data.alertNotes,
              referred_by: data.referredBy,
              referral_info: data.referralInfo,
              session_source: data.sessionSource,
              approved_sessions: data.isUnlimited ? undefined : data.approvedSessions || undefined,
              is_unlimited: data.isUnlimited
            });
            await refreshCases();
            setIsEditCaseOpen(false);
            setCaseToEdit(null);
            toast.success('Case updated successfully');
          } catch (error: any) {
            toast.error(error.response?.data?.approved_sessions?.[0] || 'Failed to update case');
          }
        }}
        practitioners={practitioners}
        loadingPractitioners={loadingPractitioners}
      />
      <ArchiveCaseModal
        isOpen={isArchiveOpen}
        onClose={() => { setIsArchiveOpen(false); setCaseToArchive(null); }}
        caseObj={caseToArchive}
        onSuccess={refreshCases}
      />
      <HardDeleteCaseModal
        isOpen={isHardDeleteOpen}
        onClose={() => { setIsHardDeleteOpen(false); setCaseToHardDelete(null); }}
        caseObj={caseToHardDelete}
        onSuccess={refreshCases}
      />
    </>
  );
};

export default PatientCasesPage;
