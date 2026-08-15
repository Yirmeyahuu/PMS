import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmRecurringContinueProps {
  isOpen: boolean;
  packageSessions: number;
  existingSessions: number;
  newSessions: number;
  onContinue: () => void;
  onCancel: () => void;
}

export const ConfirmRecurringContinue: React.FC<ConfirmRecurringContinueProps> = ({
  isOpen,
  packageSessions,
  existingSessions,
  newSessions,
  onContinue,
  onCancel,
}) => {
  if (!isOpen) return null;

  const totalSessions = existingSessions + newSessions;
  const excessSessions = Math.max(0, totalSessions - packageSessions);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]" />
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div className="bg-white shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 text-gray-900">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              Package Allocation Exceeded
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            This recurring schedule will exceed the package's <span className="font-semibold">{packageSessions}</span>-session allocation.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 mb-5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Included:</span>
              <span className="font-semibold text-slate-900">{packageSessions} sessions</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Existing:</span>
              <span className="font-semibold text-slate-900">{existingSessions} sessions</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Scheduled:</span>
              <span className="font-semibold text-slate-900">{totalSessions} sessions</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="text-slate-700 font-bold">Additional:</span>
              <span className="font-bold text-red-600">{excessSessions} sessions</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            Sessions beyond the package may require additional billing. Do you want to continue?
          </p>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium text-black bg-white border border-black hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-black border border-white hover:bg-gray-900 shadow-sm transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
