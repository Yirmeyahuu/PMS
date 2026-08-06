import React from 'react';
import { AlertTriangle, Link as LinkIcon } from 'lucide-react';

interface CaseRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToCases: () => void;
}

export const CaseRequiredModal: React.FC<CaseRequiredModalProps> = ({
  isOpen,
  onClose,
  onGoToCases,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2">Case Required</h2>
          <p className="text-sm text-slate-600 mb-6">
            This appointment has not been assigned to a Case. Please assign or create a Case before creating a Clinical Note.
          </p>

          <div className="space-y-3">
            <button
              onClick={onGoToCases}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
                  <LinkIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900 group-hover:text-indigo-900">Go to Case Assignment</div>
                  <div className="text-xs text-slate-500 group-hover:text-indigo-700">Assign or create a case in Client Information</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
