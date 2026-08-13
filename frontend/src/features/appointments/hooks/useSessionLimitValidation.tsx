import { useState, useCallback } from 'react';
import { axiosInstance } from '@/lib/axios';
import type { PatientCase } from '@/types/patient';

export const useSessionLimitValidation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [caseDetails, setCaseDetails] = useState<PatientCase | null>(null);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [editCaseOpen, setEditCaseOpen] = useState(false);

  const validateAndProceed = useCallback(async (
    patientCaseId: number | null | undefined, 
    onProceed: () => void,
    serviceId?: number | null
  ) => {
    if (!patientCaseId) {
      onProceed();
      return;
    }
    try {
      const response = await axiosInstance.get(`/patient-cases/${patientCaseId}/`);
      const ptCase: PatientCase = response.data;

      let selectedService: any = null;
      if (serviceId) {
        try {
          // Attempt to fetch the service to check if it's a package
          const srvRes = await axiosInstance.get(`/clinic-services/${serviceId}/`);
          selectedService = srvRes.data;
        } catch (e) {
          console.warn('Could not fetch service details for validation', e);
        }
      }
      
      let effectiveLimit = ptCase.approved_sessions;
      let isUnlimited = ptCase.is_unlimited;
      let isPackageOverride = false;

      if (selectedService?.is_package && selectedService.session_allocation != null) {
        effectiveLimit = selectedService.session_allocation;
        isUnlimited = false;
        isPackageOverride = true;
      }
      
      if (!isUnlimited && effectiveLimit !== null) {
        const remaining = Math.max(0, effectiveLimit - ptCase.completed_sessions);
        if (remaining <= 0) {
          setCaseDetails({
            ...ptCase,
            approved_sessions: effectiveLimit,
            remaining_sessions: remaining,
            session_source: isPackageOverride ? 'PACKAGE' : ptCase.session_source
          });
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
