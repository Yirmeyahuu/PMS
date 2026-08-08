import React, { useState, useCallback } from 'react';
import { axiosInstance } from '@/lib/axios';
import { SessionAllocationLimitModal } from '../components/SessionAllocationLimitModal';
import type { PatientCase } from '@/types/patient';

export const useSessionLimitValidation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [caseDetails, setCaseDetails] = useState<PatientCase | null>(null);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [editCaseOpen, setEditCaseOpen] = useState(false);

  const validateAndProceed = useCallback(async (patientCaseId: number | null | undefined, onProceed: () => void) => {
    if (!patientCaseId) {
      onProceed();
      return;
    }
    try {
      const response = await axiosInstance.get(`/patient-cases/${patientCaseId}/`);
      const ptCase: PatientCase = response.data;
      
      if (!ptCase.is_unlimited && ptCase.approved_sessions !== null) {
        if ((ptCase.remaining_sessions ?? 0) <= 0) {
          setCaseDetails(ptCase);
          setPendingCallback(() => onProceed);
          setIsOpen(true);
          return;
        }
      }
      onProceed();
    } catch (e) {
      console.error('Failed to validate session limit:', e);
      // Proceed and let backend catch it if there's a real issue
      onProceed();
    }
  }, []);

  const closeLimitModal = useCallback(() => {
    setIsOpen(false);
    setPendingCallback(null);
  }, []);

  const handleAddSessions = useCallback(() => {
    setIsOpen(false);
    setEditCaseOpen(true);
  }, []);

  const handleEditCaseClose = useCallback(() => {
    setEditCaseOpen(false);
    // If we closed edit case, do we resume?
    // We should only resume if they actually saved and increased sessions.
    // The consumer (App/Modal) will handle the save. We'll pass pendingCallback to it.
  }, []);

  const clearPendingCallback = useCallback(() => {
    setPendingCallback(null);
  }, []);

  return {
    validateAndProceed,
    isLimitModalOpen: isOpen,
    closeLimitModal,
    handleAddSessions,
    caseDetails,
    pendingCallback,
    clearPendingCallback,
    editCaseOpen,
    setEditCaseOpen,
    handleEditCaseClose
  };
};
