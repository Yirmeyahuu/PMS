import { useState, useEffect } from 'react';
import type { DashboardData } from '../types/dashboard.types';

/**
 * Hook to fetch dashboard data
 * TODO: Replace with actual API calls
 */
export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        const mockData: DashboardData = {
          stats: {
            todayOccupancy: {
              current: 18,
              total: 25,
              percentage: 72
            },
            todayBookings: 24,
            todayNewClients: 5,
            todayCancellations: 2
          },
          bookingsByCase: [
            { caseName: 'General Consultation', count: 45, color: '#0EA5E9' },
            { caseName: 'Follow-up Visit', count: 32, color: '#10B981' },
            { caseName: 'Laboratory Tests', count: 28, color: '#F59E0B' },
            { caseName: 'Physical Therapy', count: 22, color: '#8B5CF6' },
            { caseName: 'Dental Care', count: 18, color: '#EC4899' },
            { caseName: 'Vaccination', count: 15, color: '#06B6D4' },
          ],
          uncompletedNotes: [
            {
              id: '1',
              patientName: 'John Smith',
              appointmentDate: '2026-01-25',
              appointmentTime: '09:00 AM',
              practitioner: 'Dr. Sarah Johnson',
              caseType: 'General Consultation',
              daysPending: 2
            },
            {
              id: '2',
              patientName: 'Emily Davis',
              appointmentDate: '2026-01-24',
              appointmentTime: '02:30 PM',
              practitioner: 'Dr. Michael Chen',
              caseType: 'Follow-up Visit',
              daysPending: 3
            },
            {
              id: '3',
              patientName: 'Robert Wilson',
              appointmentDate: '2026-01-23',
              appointmentTime: '11:15 AM',
              practitioner: 'Dr. Sarah Johnson',
              caseType: 'Physical Therapy',
              daysPending: 4
            },
            {
              id: '4',
              patientName: 'Maria Garcia',
              appointmentDate: '2026-01-22',
              appointmentTime: '03:45 PM',
              practitioner: 'Dr. James Williams',
              caseType: 'Dental Care',
              daysPending: 5
            },
            {
              id: '5',
              patientName: 'David Brown',
              appointmentDate: '2026-01-21',
              appointmentTime: '10:00 AM',
              practitioner: 'Dr. Michael Chen',
              caseType: 'Laboratory Tests',
              daysPending: 6
            },
          ]
        };
        
        setData(mockData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading, error };
};