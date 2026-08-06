import { X, AlertTriangle } from 'lucide-react';
import type { PatientCase } from '@/types/patient';
import { deletePatientCase, getCaseDeletionImpact } from './patientCases.api';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

interface HardDeleteCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseObj: PatientCase | null;
  onSuccess: () => void;
}

export const HardDeleteCaseModal = ({ isOpen, onClose, caseObj, onSuccess }: HardDeleteCaseModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [impact, setImpact] = useState<any>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  useEffect(() => {
    if (isOpen && caseObj) {
      const fetchImpact = async () => {
        try {
          setLoadingImpact(true);
          const data = await getCaseDeletionImpact(caseObj.id);
          setImpact(data);
        } catch (error) {
          toast.error('Failed to load deletion impact data');
        } finally {
          setLoadingImpact(false);
        }
      };
      fetchImpact();
    } else {
      setImpact(null);
    }
  }, [isOpen, caseObj]);

  if (!isOpen || !caseObj) return null;

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await deletePatientCase(caseObj.id);
      toast.success('Case permanently deleted');
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to permanently delete cases.');
      } else {
        toast.error('Failed to delete case permanently');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Permanent Delete Case
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm font-bold text-red-600 mb-4 uppercase tracking-wider">
              This action cannot be undone.
            </p>
            <p className="text-sm text-gray-700 mb-4">
              The following data will be permanently removed:
            </p>
            
            {loadingImpact ? (
              <div className="text-sm text-gray-500 animate-pulse">Loading impact data...</div>
            ) : impact ? (
              <ul className="text-sm text-gray-600 space-y-2 bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                <li className="flex justify-between"><span>Appointments:</span> <strong>{impact.appointments}</strong></li>
                <li className="flex justify-between"><span>Clinical Notes:</span> <strong>{impact.notes}</strong></li>
                <li className="flex justify-between"><span>Letters:</span> <strong>{impact.letters}</strong></li>
                <li className="flex justify-between"><span>Documents:</span> <strong>{impact.documents}</strong></li>
                <li className="flex justify-between"><span>Invoices:</span> <strong>{impact.invoices}</strong></li>
                <li className="flex justify-between"><span>Completed Sessions:</span> <strong>{impact.completed_sessions}</strong></li>
                <li className="flex justify-between"><span>Remaining Sessions:</span> <strong>{impact.remaining_sessions}</strong></li>
              </ul>
            ) : null}
            
            <p className="text-sm text-gray-500">
              Please confirm you wish to proceed with permanent deletion.
            </p>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting || loadingImpact}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
