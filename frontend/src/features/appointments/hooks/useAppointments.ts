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
      const apptParams: Record<string, any> = {
        start_date: startDateStr,
        end_date:   endDateStr,
        page_size:  1000,
      };

      if (clinicBranchId !== null) apptParams.clinic_branch = clinicBranchId;
      if (practitionerId !== null) apptParams.practitioner  = practitionerId;

      // ── Portal bookings: fetch ALL for the date range (no branch/practitioner filter)
      // We do client-side filtering below so we can correctly handle:
      //   - "Any Available" bookings (practitioner_branch_id = null) → show in ALL branches
      //   - Practitioner-specific bookings → show only in their assigned branch
      const portalParams: Record<string, any> = {
        start_date: startDateStr,
        end_date:   endDateStr,
      };
      // Only pass practitioner filter to backend — NOT clinic_branch
      // (branch filtering is done client-side to handle null practitioner_branch_id correctly)
      if (practitionerId !== null) portalParams.practitioner = practitionerId;

      const [apptResponse, portalResponse] = await Promise.all([
        getAppointments(apptParams),
        getPortalBookingsForDiary(portalParams),
      ]);

      setAppointments(apptResponse.results);

      // ── Client-side portal booking filter ─────────────────────────────────
      // Step 1: only PENDING bookings
      const pendingBookings = portalResponse.filter(
        (b: PortalBookingDiaryItem) => b.status === 'PENDING'
      );

      // Step 2: apply branch filter
      // Rule:
      //   No branch selected (All Branches)  → show ALL pending bookings
      //   Branch selected →
      //     practitioner_branch_id === null   → "Any Available" → SHOW (visible everywhere)
      //     practitioner_branch_id === branchId → practitioner is in THIS branch → SHOW
      //     practitioner_branch_id !== branchId → practitioner is in ANOTHER branch → HIDE
      const filteredBookings =
        clinicBranchId === null
          ? pendingBookings
          : pendingBookings.filter((b: PortalBookingDiaryItem) => {
              // "Any Available" — no specific practitioner → show in every branch tab
              if (b.practitioner_id === null) return true;
              // Practitioner has no branch assigned → show everywhere
              if (b.practitioner_branch_id === null) return true;
              // Practitioner is assigned to the selected branch → show
              return b.practitioner_branch_id === clinicBranchId;
            });

      setPortalBookings(filteredBookings);

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

  const updateAppointmentInState = useCallback((updated: Appointment) => {
    setAppointments(prev =>
      prev.map(appt => appt.id === updated.id ? updated : appt)
    );
  }, []);

  return {
    appointments,
    portalBookings,
    loading,
    error,
    refetch: fetchAppointments,
    removePortalBooking,
    updateAppointmentInState,
  };
};