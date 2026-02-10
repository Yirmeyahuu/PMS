import { useState, useEffect } from 'react';
import {
  getDashboardMetrics,
  getAppointmentsSummary,
  getPatientStatistics,
  getUncompletedNotes,
} from '../api/dashboard.api';
import type { DashboardData, UncompletedNote } from '../types/dashboard.types';
import toast from 'react-hot-toast';

// Color palette for appointment types
const CASE_COLORS = [
  '#0EA5E9', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#84CC16', // Lime
];

/**
 * Hook to fetch real dashboard data from backend
 */
export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get today's date for appointments summary
        const today = new Date().toISOString().split('T')[0];

        // Fetch all data in parallel
        const [metrics, appointmentsSummary, patientStats, uncompletedNotesData] =
          await Promise.all([
            getDashboardMetrics(),
            getAppointmentsSummary(today, today),
            getPatientStatistics(),
            getUncompletedNotes(),
          ]);

        // Transform backend data to match frontend types
        const dashboardData: DashboardData = {
          stats: {
            todayOccupancy: {
              current: metrics.today_completed,
              total: metrics.today_appointments,
              percentage:
                metrics.today_appointments > 0
                  ? Math.round(
                      (metrics.today_completed / metrics.today_appointments) * 100
                    )
                  : 0,
            },
            todayBookings: metrics.today_appointments,
            todayNewClients: patientStats.new_this_month,
            todayCancellations: appointmentsSummary.cancelled,
          },
          bookingsByCase: appointmentsSummary.by_type.map((item, index) => ({
            caseName: formatAppointmentType(item.appointment_type),
            count: item.count,
            color: CASE_COLORS[index % CASE_COLORS.length],
          })),
          uncompletedNotes: uncompletedNotesData.map((note) =>
            transformUncompletedNote(note)
          ),
        };

        setData(dashboardData);
      } catch (err: any) {
        const message =
          err.response?.data?.detail || 'Failed to fetch dashboard data';
        setError(message);
        console.error('Dashboard data fetch error:', err);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    // Trigger re-fetch by updating a dependency or calling fetchData again
    window.location.reload(); // Simple refresh for now
  };

  return { data, isLoading, error, refresh };
};

/**
 * Format appointment type from backend to display name
 */
function formatAppointmentType(type: string): string {
  const typeMap: Record<string, string> = {
    CONSULTATION: 'General Consultation',
    FOLLOW_UP: 'Follow-up Visit',
    PROCEDURE: 'Procedure',
    SURGERY: 'Surgery',
    THERAPY: 'Physical Therapy',
    VACCINATION: 'Vaccination',
    LAB: 'Laboratory Tests',
    IMAGING: 'Imaging',
    OTHER: 'Other',
  };

  return typeMap[type] || type.replace('_', ' ');
}

/**
 * Transform backend uncompleted note to frontend format
 */
function transformUncompletedNote(note: any): UncompletedNote {
  const createdDate = new Date(note.created_at);
  const today = new Date();
  const daysPending = Math.floor(
    (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    id: note.id,
    patientName: note.patient?.full_name || 'Unknown Patient',
    appointmentDate: note.appointment?.date || note.date,
    appointmentTime: note.appointment?.start_time || '00:00',
    practitioner: note.practitioner
      ? `${note.practitioner.user.first_name} ${note.practitioner.user.last_name}`
      : 'Unknown Practitioner',
    caseType: formatAppointmentType(
      note.appointment?.appointment_type || note.note_type || 'OTHER'
    ),
    daysPending,
  };
}