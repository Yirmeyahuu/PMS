import { useState, useEffect, useCallback, useRef } from 'react';
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
  const fetchIdRef = useRef(0);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr   = format(endDate,   'yyyy-MM-dd');

  const fetchAppointments = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      // FIX: Build params with proper typing
      // page_size is capped at 200; date-range filtering on the backend
      // ensures results are already scoped to the visible calendar window.
      const apptParams: { start_date: string; end_date: string; practitioner?: number; page_size?: number } = {
        start_date: startDateStr,
        end_date:   endDateStr,
        page_size:  200,
      };
      if (practitionerId !== null) apptParams.practitioner = practitionerId;

      const portalParams: { start_date: string; end_date: string; practitioner?: number } = {
        start_date: startDateStr,
        end_date:   endDateStr,
      };
      if (practitionerId !== null) portalParams.practitioner = practitionerId;

      const [apptResponse, portalResponse] = await Promise.all([
        getAppointments(apptParams),
        getPortalBookingsForDiary(portalParams),
      ]);

      if (fetchIdRef.current !== fetchId) return;

      const allAppointments: Appointment[] = apptResponse.results;

      const filteredAppointments = clinicBranchId === null
        ? allAppointments
        : allAppointments.filter(apt => {
            const aptBranch = apt.branch_id ?? apt.clinic;
            return aptBranch === clinicBranchId;
          });

      setAppointments(filteredAppointments);

      const pendingBookings = portalResponse.filter(
        (b: PortalBookingDiaryItem) => b.status === 'PENDING'
      );

      const filteredBookings = clinicBranchId === null
        ? pendingBookings
        : pendingBookings.filter((b: PortalBookingDiaryItem) => {
            const bookingBranch = b.practitioner_branch_id ?? b.portal_clinic_id ?? null;
            if (bookingBranch === null) return true;
            return bookingBranch === clinicBranchId;
          });

      setPortalBookings(filteredBookings);

    } catch (err: any) {
      if (fetchIdRef.current !== fetchId) return;
      console.error('Failed to fetch appointments:', err);
      const msg = err.response?.data?.detail || 'Failed to load appointments';
      setError(msg);
      toast.error(msg);
    } finally {
      if (fetchIdRef.current === fetchId) {
        setLoading(false);
      }
    }
  }, [startDateStr, endDateStr, practitionerId, clinicBranchId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const removePortalBooking = useCallback((bookingId: number) => {
    setPortalBookings(prev => prev.filter(b => b.id !== bookingId));
  }, []);

  // ── Filter helpers (mirror the API-level filters applied during fetch) ──────
  // These ensure WS-injected items are held to the same practitioner + branch
  // constraints as the initial fetch, preventing cross-practitioner state pollution.
  const passesFilter = useCallback((apt: Appointment): boolean => {
    if (practitionerId !== null && apt.practitioner !== practitionerId) return false;
    const aptBranch = apt.branch_id ?? apt.clinic;
    if (clinicBranchId !== null && aptBranch !== clinicBranchId) return false;
    return true;
  }, [practitionerId, clinicBranchId]);

  const updateAppointmentInState = useCallback((updated: Appointment) => {
    setAppointments(prev => {
      const fits       = passesFilter(updated);
      const existsInState = prev.some(a => a.id === updated.id);
      if (!fits && !existsInState) return prev;                                    // no-op
      if (!fits &&  existsInState) return prev.filter(a => a.id !== updated.id);  // evict (e.g. re-assigned away)
      if ( fits && !existsInState) return [...prev, updated];                      // add  (e.g. re-assigned to current prac)
      return prev.map(appt => appt.id === updated.id ? updated : appt);            // normal update
    });
  }, [passesFilter]);

  const addAppointmentToState = useCallback((appointment: Appointment) => {
    if (!passesFilter(appointment)) return;
    setAppointments(prev => {
      if (prev.some(a => a.id === appointment.id)) return prev;
      return [...prev, appointment];
    });
  }, [passesFilter]);

  const removeAppointmentFromState = useCallback((appointmentId: number) => {
    setAppointments(prev => prev.filter(a => a.id !== appointmentId));
  }, []);

  return {
    appointments,
    portalBookings,
    loading,
    error,
    refetch: fetchAppointments,
    removePortalBooking,
    updateAppointmentInState,
    addAppointmentToState,
    removeAppointmentFromState,
  };
};