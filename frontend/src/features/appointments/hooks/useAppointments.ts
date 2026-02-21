import { useState, useEffect, useCallback } from 'react';
import { getAppointments } from '../appointment.api';
import { format } from 'date-fns';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

interface UseAppointmentsParams {
  startDate: Date;
  endDate: Date;
  practitionerId?: number | null;
  clinicBranchId?: number | null; // ✅ NEW
}

export const useAppointments = ({ 
  startDate, 
  endDate,
  practitionerId = null,
  clinicBranchId = null // ✅ NEW
}: UseAppointmentsParams) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        start_date: startDateStr,
        end_date: endDateStr,
        page_size: 1000,
      };

      // Add practitioner filter if selected
      if (practitionerId !== null) {
        params.practitioner = practitionerId;
      }

      // ✅ NEW: Add clinic branch filter if selected
      if (clinicBranchId !== null) {
        params.clinic_branch = clinicBranchId;
      }

      const response = await getAppointments(params);
      
      setAppointments(response.results);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to load appointments';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [startDateStr, endDateStr, practitionerId, clinicBranchId]); // ✅ Add clinicBranchId to dependencies

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
  };
};