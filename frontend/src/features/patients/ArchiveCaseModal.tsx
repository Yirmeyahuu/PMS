import { X, Archive } from 'lucide-react';
import type { PatientCase } from '@/types/patient';
import { archivePatientCase } from './patientCases.api';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface ArchiveCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseObj: PatientCase | null;
  onSuccess: () => void;
}

export const ArchiveCaseModal = ({ isOpen, onClose, caseObj, onSuccess }: ArchiveCaseModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !caseObj) return null;

  const handleArchive = async () => {
    try {
      setIsSubmitting(true);
      await archivePatientCase(caseObj.id);
      toast.success('Case archived successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to archive case');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Archive className="w-5 h-5 text-gray-500" />
              Archive Case?
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-700 mb-4">
              This Case will be removed from the active Case list.
            </p>
            <p className="text-sm text-gray-600 font-medium mb-4">
              Appointments, notes, invoices, documents, and session history will remain preserved.
            </p>
            <p className="text-sm text-gray-500">
              You can restore or permanently delete this Case later.
            </p>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleArchive}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Archiving...' : 'Archive Case'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
