import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { PatientCase } from '@/types/patient';

interface SessionAllocationLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientCase: PatientCase | null;
  onAddSessions: () => void;
}

export const SessionAllocationLimitModal: React.FC<SessionAllocationLimitModalProps> = ({
  isOpen,
  onClose,
  patientCase,
  onAddSessions
}) => {
  if (!isOpen || !patientCase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Session Allocation Reached</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-6 leading-relaxed">
            This case has reached its approved session allocation.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Approved Sessions:</span>
              <span className="font-semibold text-slate-900">{patientCase.approved_sessions}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Completed Sessions:</span>
              <span className="font-semibold text-slate-900">{patientCase.completed_sessions}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="text-slate-700 font-bold">Remaining Sessions:</span>
              <span className="font-bold text-red-600">{patientCase.remaining_sessions ?? 0}</span>
            </div>
          </div>

          <p className="text-sm font-medium text-slate-700 mb-6">
            Would you like to allocate additional sessions before continuing?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onAddSessions}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              Add Sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
