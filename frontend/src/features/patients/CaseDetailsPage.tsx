import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Calendar, LayoutDashboard, History, 
  CreditCard, Files, CheckCircle, Clock 
} from 'lucide-react';
import { usePatientProfileContext } from './context/PatientProfileContext';
import type { PatientCase } from '@/types/patient';
import { formatDate } from './patientProfile.utils';

type Tab = 'overview' | 'sessions' | 'appointments' | 'notes' | 'letters' | 'documents' | 'timeline' | 'billing';

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'sessions', label: 'Sessions', icon: <Clock className="w-4 h-4" /> },
  { id: 'appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> },
  { id: 'notes', label: 'Clinical Notes', icon: <FileText className="w-4 h-4" /> },
  { id: 'letters', label: 'Letters', icon: <FileText className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents', icon: <Files className="w-4 h-4" /> },
  { id: 'timeline', label: 'Timeline', icon: <History className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
];

export const CaseDetailsPage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { patient, cases } = usePatientProfileContext();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const caseData = useMemo(() => {
    if (!caseId) return null;
    return cases.find(c => c.id === Number(caseId)) || null;
  }, [cases, caseId]);

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
        <p>Case not found or loading...</p>
        <button 
          onClick={() => navigate(`/patients/${patient?.id}/cases`)}
          className="mt-4 text-sky-600 hover:underline"
        >
          Back to Cases
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'MONITORING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DISCHARGED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate(`/patients/${patient?.id}/cases`)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-heading text-gray-900 flex items-center gap-3">
              {caseData.title}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(caseData.status)}`}>
                {caseData.status.charAt(0) + caseData.status.slice(1).toLowerCase()}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Created {formatDate(caseData.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm text-gray-600 mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            <span>Practitioner: <strong>{caseData.primary_practitioner_name || 'Unassigned'}</strong></span>
          </div>
          {caseData.approved_sessions !== null && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Sessions Used: <strong>{caseData.completed_sessions}</strong> / {caseData.approved_sessions}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto hide-scrollbar">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {activeTab === 'overview' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-4 rounded-xl border border-gray-200">
                  {caseData.description || 'No description provided.'}
                </p>
              </div>
              {caseData.alert_notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Alert Notes</h3>
                  <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    {caseData.alert_notes}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'sessions' && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-gray-200">
              Session history feature is coming soon.
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-gray-200">
              Case appointments feature is coming soon.
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-gray-200">
              <p>Clinical notes have been moved to the Clinical Documentation Workspace.</p>
              <button 
                onClick={() => navigate(`/patients/${patient?.id}/clinical`)}
                className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
              >
                Go to Clinical Documentation
              </button>
            </div>
          )}

          {['letters', 'documents', 'timeline', 'billing'].includes(activeTab) && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2 capitalize">{activeTab}</h3>
              <p>This module is currently under development.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetailsPage;
