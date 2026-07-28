import React, { useState } from 'react';
import { Clock, PlusCircle, MinusCircle, RefreshCcw, Unlock, AlertCircle } from 'lucide-react';
import type { PatientCase } from '@/types/patient';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getCaseSessionLogs, addCaseSessions, removeCaseSessions, removeCaseSessionLimit, resetCaseAllocation } from '../patientCases.api';
import toast from 'react-hot-toast';

import { AddCaseSessionModal } from './AddCaseSessionModal';
import { RemoveCaseSessionModal } from './RemoveCaseSessionModal';
import { RemoveLimitModal } from './RemoveLimitModal';

interface CaseSessionsTabProps {
  caseData: PatientCase;
  onUpdate: () => void;
}

export const CaseSessionsTab: React.FC<CaseSessionsTabProps> = ({ caseData, onUpdate }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isRemoveLimitOpen, setIsRemoveLimitOpen] = useState(false);

  const { data: logs, isLoading: loadingLogs, refetch } = useQuery({
    queryKey: ['case-session-logs', caseData.id],
    queryFn: () => getCaseSessionLogs(caseData.id),
  });

  const handleAddSessions = async (amount: number) => {
    try {
      await addCaseSessions(caseData.id, amount);
      toast.success(`${amount} sessions added successfully.`);
      refetch();
      onUpdate();
    } catch (error) {
      toast.error('Failed to add sessions.');
      throw error;
    }
  };

  const handleRemoveSessions = async (amount: number) => {
    try {
      await removeCaseSessions(caseData.id, amount);
      toast.success(`${amount} sessions removed successfully.`);
      refetch();
      onUpdate();
    } catch (error) {
      toast.error('Failed to remove sessions.');
      throw error;
    }
  };

  const handleRemoveLimit = async () => {
    try {
      await removeCaseSessionLimit(caseData.id);
      toast.success('Session limit removed (Unlimited).');
      refetch();
      onUpdate();
    } catch (error) {
      toast.error('Failed to remove session limit.');
      throw error;
    }
  };

  const handleResetAllocation = async () => {
    if (!window.confirm('Are you sure you want to completely reset the session allocation for this case? This will set approved and used sessions to 0.')) {
      return;
    }
    try {
      await resetCaseAllocation(caseData.id);
      toast.success('Allocation fully reset.');
      refetch();
      onUpdate();
    } catch (error) {
      toast.error('Failed to reset allocation.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            Session Allocation Status
          </h3>
          <p className="text-xs text-gray-500">
            Manage treatment sessions and view consumption history for this case.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">
            {caseData.is_unlimited ? '∞' : (caseData.remaining_sessions ?? 0)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            Remaining Sessions
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-sky-300 hover:shadow-md transition-all text-sky-700 group"
        >
          <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold">Add Sessions</span>
        </button>
        <button
          onClick={() => setIsRemoveOpen(true)}
          disabled={caseData.is_unlimited}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all text-amber-700 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <MinusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold">Remove Sessions</span>
        </button>
        <button
          onClick={() => setIsRemoveLimitOpen(true)}
          disabled={caseData.is_unlimited}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all text-emerald-700 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Unlock className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold">Unlimited</span>
        </button>
        <button
          onClick={handleResetAllocation}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-red-300 hover:shadow-md transition-all text-red-700 group"
        >
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
            <RefreshCcw className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold">Reset All</span>
        </button>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Consumption Audit Log</h3>
        </div>
        <div className="p-0">
          {loadingLogs ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading history...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No session history recorded yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log: any) => (
                <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    log.action.includes('ADDED') || log.action === 'REMOVED_LIMIT' ? 'bg-emerald-100 text-emerald-600' :
                    log.action.includes('REMOVED_SESSION') ? 'bg-amber-100 text-amber-600' :
                    'bg-sky-100 text-sky-600'
                  }`}>
                    {log.action.includes('ADDED') ? <PlusCircle className="w-4 h-4" /> :
                     log.action.includes('REMOVED_SESSION') ? <MinusCircle className="w-4 h-4" /> :
                     log.action === 'REMOVED_LIMIT' ? <Unlock className="w-4 h-4" /> :
                     <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {log.action.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {log.amount ? `${log.amount} sessions. ` : ''} 
                      {log.reason ? `Reason: ${log.reason}` : `By: ${log.user_name || log.created_by_name || 'System'}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-900">{format(new Date(log.created_at), 'MMM d, yyyy')}</p>
                    <p className="text-[10px] text-gray-500">{format(new Date(log.created_at), 'h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddCaseSessionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        caseTitle={caseData.title}
        onSave={handleAddSessions}
      />
      <RemoveCaseSessionModal
        isOpen={isRemoveOpen}
        onClose={() => setIsRemoveOpen(false)}
        caseTitle={caseData.title}
        onRemove={handleRemoveSessions}
      />
      <RemoveLimitModal
        isOpen={isRemoveLimitOpen}
        onClose={() => setIsRemoveLimitOpen(false)}
        caseTitle={caseData.title}
        onConfirm={handleRemoveLimit}
      />
    </div>
  );
};
