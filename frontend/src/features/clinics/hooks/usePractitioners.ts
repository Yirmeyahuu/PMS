import { useState, useEffect } from 'react';
import { getPractitioners } from '../clinic.api';
import type { Practitioner } from '../clinic.api';
import toast from 'react-hot-toast';

interface UsePractitionersParams {
  clinicBranchId?: number | null;
}

interface UsePractitionersReturn {
  practitioners: Practitioner[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage practitioners
 * Optionally filter by clinic branch
 */
export const usePractitioners = (params?: UsePractitionersParams): UsePractitionersReturn => {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPractitioners = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getPractitioners(params?.clinicBranchId);
      setPractitioners(response.practitioners);
    } catch (err: any) {
      console.error('Failed to fetch practitioners:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to load practitioners';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPractitioners();
  }, [params?.clinicBranchId]); // ✅ Refetch when clinic branch changes

  return {
    practitioners,
    loading,
    error,
    refetch: fetchPractitioners,
  };
};