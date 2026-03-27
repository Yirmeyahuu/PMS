import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getTodayArrivals } from '../appointment.api';
import type { Appointment } from '@/types';

interface ArrivalsListProps {
  selectedDate: Date;
}

const fmtArrivalTime = (arrivalTime: string | null): string => {
  if (!arrivalTime) return '--:-- --';
  return format(new Date(arrivalTime), 'h:mm a');
};

export const ArrivalsList: React.FC<ArrivalsListProps> = ({ selectedDate }) => {
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: arrivals = [], isLoading } = useQuery({
    queryKey: ['today-arrivals'],
    queryFn: async () => {
      const allArrivals = await getTodayArrivals();
      return allArrivals.filter((apt: Appointment) => apt.date === selectedDateStr);
    },
    refetchInterval: 30000,
  });

  // Limit to 3 arrivals, rest are scrollable
  const displayArrivals = arrivals.slice(0, 3);
  const hasMore = arrivals.length > 3;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (arrivals.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-4">
        No arrivals for {format(selectedDate, 'MMM d')}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${hasMore ? 'max-h-48 overflow-y-auto' : ''}`}>
      {displayArrivals.map((appointment) => (
        <div
          key={appointment.id}
          className="p-3 rounded-lg border border-purple-100 bg-purple-50"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {appointment.practitioner_name ?? 'Unassigned'}
              </p>
              <p className="text-xs text-gray-500 truncate mt-1">
                {appointment.patient_name}
              </p>
            </div>
            <div className="flex-shrink-0 ml-2">
              <p className="text-xs font-medium text-purple-600">
                Arrived
              </p>
              <p className="text-[10px] text-purple-500">
                {fmtArrivalTime(appointment.arrival_time)}
              </p>
            </div>
          </div>
        </div>
      ))}
      {hasMore && (
        <p className="text-xs text-gray-400 text-center pt-2">
          +{arrivals.length - 3} more arrivals
        </p>
      )}
    </div>
  );
};