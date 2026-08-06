import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RemoveLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseTitle: string;
  onConfirm: () => Promise<void>;
}

export const RemoveLimitModal: React.FC<RemoveLimitModalProps> = ({
  isOpen,
  onClose,
  caseTitle,
  onConfirm,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to remove session limit';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={!isSaving ? onClose : undefined} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-xl pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">Remove Session Limit</h3>
                <p className="text-xs text-gray-500 truncate">{caseTitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5">
            <p className="text-sm text-gray-600 mb-6 text-center">
              Are you sure you want to remove the session limit for this case? Sessions will no longer be capped.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-red-600/20"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Yes, Remove Limit'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
