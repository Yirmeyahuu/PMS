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

export interface BookingByType {
  type:  string;
  count: number;
  color: string;
}

/** @deprecated use BookingByType */
export type BookingByCase = BookingByType;

export interface WeeklyBooking {
  day:   string;   // "Mon", "Tue", …
  date:  string;   // "2026-04-07"
  count: number;
}

export interface DashboardData {
  stats:            DashboardStats;
  bookingsByType:   BookingByType[];
  weeklyBookings:   WeeklyBooking[];
}