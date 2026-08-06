import React, { useState, useEffect } from 'react';
import { X, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddCaseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseTitle: string;
  onSave: (amount: number) => Promise<void>;
}

export const AddCaseSessionModal: React.FC<AddCaseSessionModalProps> = ({
  isOpen,
  onClose,
  caseTitle,
  onSave,
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof amount !== 'number' || amount <= 0) {
      toast.error('Please enter a valid positive number of sessions.');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(amount);
      onClose();
    } catch (err) {
      // Error handled by parent usually, but we stop loading
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
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <PlusCircle className="w-4 h-4 text-sky-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">Add Sessions</h3>
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

          <form onSubmit={handleSubmit} className="p-5">
            <div className="mb-6">
              <label htmlFor="session-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Number of sessions to add
              </label>
              <input
                id="session-amount"
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="w-full text-center text-xl font-bold py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                placeholder="0"
                autoFocus
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 text-center mt-2">
                This will increase the approved session limit.
              </p>
            </div>

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
                type="submit"
                disabled={isSaving || amount === '' || amount <= 0}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Add Sessions'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
