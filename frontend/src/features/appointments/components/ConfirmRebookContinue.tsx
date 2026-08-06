import React from 'react';
import { Calendar } from 'lucide-react';

interface ConfirmRebookContinueProps {
  isOpen: boolean;
  patientName: string;
  onContinue: () => void;
  onClose: () => void;
}

export const ConfirmRebookContinue: React.FC<ConfirmRebookContinueProps> = ({
  isOpen,
  patientName,
  onContinue,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="mx-auto w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Rebooked Successfully!</h3>
          <p className="text-sm text-gray-600 mb-6">
            Do you want to continue adding more appointments for <span className="font-semibold text-gray-900">{patientName}</span>?
          </p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              No, I'm done
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-sky-600 rounded-xl hover:bg-sky-700 shadow-sm transition-colors"
            >
              Yes, continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
