import { useState, useEffect, useCallback } from 'react';
import { getPatients, type PatientFilters } from '../patient.api';
import type { Patient } from '@/types';
import toast from 'react-hot-toast';

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<PatientFilters>({
    page: 1,
    page_size: 10,
  });

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getPatients(filters);
      setPatients(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to load patients';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ✅ Wrap in useCallback to prevent recreation
  const updateFilters = useCallback((newFilters: Partial<PatientFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // ✅ Wrap in useCallback to prevent recreation
  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    isLoading,
    error,
    totalCount,
    filters,
    updateFilters,
    setPage,
    refresh,
  };
};