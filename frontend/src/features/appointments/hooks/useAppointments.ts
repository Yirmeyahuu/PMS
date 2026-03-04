import { useState, useEffect, useCallback } from 'react';
import { getAppointments, getPortalBookingsForDiary } from '../appointment.api';
import { format } from 'date-fns';
import type { Appointment } from '@/types';
import type { PortalBookingDiaryItem } from '../appointment.api';
import toast from 'react-hot-toast';

interface UseAppointmentsParams {
  startDate:       Date;
  endDate:         Date;
  practitionerId?: number | null;
  clinicBranchId?: number | null;
}

export const useAppointments = ({
  startDate,
  endDate,
  practitionerId = null,
  clinicBranchId = null,
}: UseAppointmentsParams) => {
  const [appointments,   setAppointments]   = useState<Appointment[]>([]);
  const [portalBookings, setPortalBookings] = useState<PortalBookingDiaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr   = format(endDate,   'yyyy-MM-dd');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        start_date: startDateStr,
        end_date:   endDateStr,
        page_size:  1000,
      };

      if (practitionerId !== null) params.practitioner  = practitionerId;
      if (clinicBranchId  !== null) params.clinic_branch = clinicBranchId;

      const [apptResponse, portalResponse] = await Promise.all([
        getAppointments(params),
        getPortalBookingsForDiary({ date_from: startDateStr, date_to: endDateStr }),
      ]);

      setAppointments(apptResponse.results);
      setPortalBookings(portalResponse);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      const msg = err.response?.data?.detail || 'Failed to load appointments';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [startDateStr, endDateStr, practitionerId, clinicBranchId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, portalBookings, loading, error, refetch: fetchAppointments };
};