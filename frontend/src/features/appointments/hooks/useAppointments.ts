// filepath: useAppointments.ts
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
      // Backend get_queryset reads 'start_date' and 'end_date'
      const apptParams: Record<string, any> = {
        start_date: startDateStr,
        end_date:   endDateStr,
        page_size:  1000,
      };

      // Always send clinic_branch when selected — this is what scopes to a branch
      if (clinicBranchId !== null) apptParams.clinic_branch = clinicBranchId;
      // Only add practitioner if one is selected
      if (practitionerId !== null) apptParams.practitioner = practitionerId;

      const portalParams: Record<string, any> = {
        start_date: startDateStr,
        end_date:   endDateStr,
      };
      if (clinicBranchId !== null) portalParams.clinic_branch = clinicBranchId;
      if (practitionerId !== null) portalParams.practitioner  = practitionerId;

      const [apptResponse, portalResponse] = await Promise.all([
        getAppointments(apptParams),
        getPortalBookingsForDiary(portalParams),
      ]);

      setAppointments(apptResponse.results);
      setPortalBookings(portalResponse.filter((b: PortalBookingDiaryItem) => b.status === 'PENDING'));
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

  const removePortalBooking = useCallback((bookingId: number) => {
    setPortalBookings(prev => prev.filter(b => b.id !== bookingId));
  }, []);

  return { appointments, portalBookings, loading, error, refetch: fetchAppointments, removePortalBooking };
};