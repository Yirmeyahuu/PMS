import axiosInstance from '@/lib/axios';

export interface DashboardMetricsResponse {
  today_appointments: number;
  today_completed: number;
  today_pending: number;
  month_revenue: number;
  active_patients: number;
  pending_invoices: number;
}

export interface AppointmentsSummaryResponse {
  total_appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  by_type: Array<{
    appointment_type: string;
    count: number;
  }>;
  by_practitioner: Array<{
    practitioner__user__first_name: string;
    practitioner__user__last_name: string;
    count: number;
  }>;
}

export interface PatientStatisticsResponse {
  total_patients: number;
  active_patients: number;
  new_this_month: number;
  by_gender: Array<{
    gender: string;
    count: number;
  }>;
}

export interface UncompletedNote {
  id: number;
  patient: {
    id: number;
    full_name: string;
  };
  practitioner: {
    id: number;
    user: {
      first_name: string;
      last_name: string;
    };
  };
  appointment?: {
    id: number;
    date: string;
    start_time: string;
    appointment_type: string;
  };
  date: string;
  note_type: string;
  is_signed: boolean;
  created_at: string;
}

/**
 * Get dashboard metrics for today
 */
export const getDashboardMetrics = async (): Promise<DashboardMetricsResponse> => {
  const response = await axiosInstance.get<DashboardMetricsResponse>(
    '/reports/dashboard_metrics/'
  );
  return response.data;
};

/**
 * Get appointments summary with date range
 */
export const getAppointmentsSummary = async (
  startDate?: string,
  endDate?: string
): Promise<AppointmentsSummaryResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await axiosInstance.get<AppointmentsSummaryResponse>(
    `/reports/appointments_summary/?${params.toString()}`
  );
  return response.data;
};

/**
 * Get patient statistics
 */
export const getPatientStatistics = async (): Promise<PatientStatisticsResponse> => {
  const response = await axiosInstance.get<PatientStatisticsResponse>(
    '/reports/patient_statistics/'
  );
  return response.data;
};

/**
 * Get uncompleted clinical notes
 */
export const getUncompletedNotes = async (): Promise<UncompletedNote[]> => {
  const response = await axiosInstance.get<{ results: UncompletedNote[] }>(
    '/clinical-notes/?is_signed=false'
  );
  return response.data.results;
};