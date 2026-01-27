export interface DashboardStats {
  todayOccupancy: {
    current: number;
    total: number;
    percentage: number;
  };
  todayBookings: number;
  todayNewClients: number;
  todayCancellations: number;
}

export interface BookingByCase {
  caseName: string;
  count: number;
  color: string;
}

export interface UncompletedNote {
  id: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  practitioner: string;
  caseType: string;
  daysPending: number;
}

export interface DashboardData {
  stats: DashboardStats;
  bookingsByCase: BookingByCase[];
  uncompletedNotes: UncompletedNote[];
}