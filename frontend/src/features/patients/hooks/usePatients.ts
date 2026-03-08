import { useState, useEffect, useCallback } from 'react';
import { getPatients, archivePatient, restorePatient, type PatientFilters } from '../patient.api';
import type { Patient } from '@/types';
import toast from 'react-hot-toast';

export type PatientView = 'active' | 'archived';

export const usePatients = () => {
  const [patients,    setPatients]    = useState<Patient[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [totalCount,  setTotalCount]  = useState(0);
  const [view,        setView]        = useState<PatientView>('active');
  const [filters,     setFilters]     = useState<PatientFilters>({
    page:      1,
    page_size: 10,
  });

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: PatientFilters = {
        ...filters,
        ...(view === 'archived' ? { archived: true } : {}),
      };
      const response = await getPatients(params);
      setPatients(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to load patients';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, view]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const updateFilters = useCallback((newFilters: Partial<PatientFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => {
    fetchPatients();
  }, [fetchPatients]);

  const switchView = useCallback((newView: PatientView) => {
    setView(newView);
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  /**
   * Archive a patient and remove them from the current (active) list.
   */
  const handleArchive = useCallback(async (patient: Patient): Promise<boolean> => {
    try {
      await archivePatient(patient.id);
      toast.success(`${patient.full_name} has been archived.`);
      // Refresh so counts + list stay in sync
      fetchPatients();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to archive patient';
      toast.error(message);
      return false;
    }
  }, [fetchPatients]);

  /**
   * Restore an archived patient and remove them from the archived list.
   */
  const handleRestore = useCallback(async (patient: Patient): Promise<boolean> => {
    try {
      await restorePatient(patient.id);
      toast.success(`${patient.full_name} has been restored.`);
      fetchPatients();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to restore patient';
      toast.error(message);
      return false;
    }
  }, [fetchPatients]);

  return {
    patients,
    isLoading,
    error,
    totalCount,
    filters,
    view,
    updateFilters,
    setPage,
    refresh,
    switchView,
    handleArchive,
    handleRestore,
  };
};