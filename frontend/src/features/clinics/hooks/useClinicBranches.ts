import { useState, useEffect } from 'react';
import { getClinicBranches } from '../clinic.api';
import type { ClinicBranch } from '@/types/clinic';
import toast from 'react-hot-toast';

interface UseClinicBranchesReturn {
  branches: ClinicBranch[];
  mainClinicId: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage clinic branches
 */
export const useClinicBranches = (): UseClinicBranchesReturn => {
  const [branches, setBranches] = useState<ClinicBranch[]>([]);
  const [mainClinicId, setMainClinicId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getClinicBranches();
      setBranches(response.branches);
      setMainClinicId(response.main_clinic_id);
    } catch (err: any) {
      console.error('Failed to fetch clinic branches:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to load clinic branches';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  return {
    branches,
    mainClinicId,
    loading,
    error,
    refetch: fetchBranches,
  };
};