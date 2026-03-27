import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, MapPin, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getTodayArrivals } from '../api/dashboard.api';
import type { Appointment } from '@/types';

interface TodayArrivalsWidgetProps {
  onAppointmentClick?: (appointment: Appointment) => void;
}

const fmtArrivalTime = (arrivalTime: string | null): string => {
  if (!arrivalTime) return '--:-- --';
  return format(new Date(arrivalTime), 'h:mm a');
};

export const TodayArrivalsWidget: React.FC<TodayArrivalsWidgetProps> = ({
  onAppointmentClick,
}) => {
  const { data: arrivals = [], isLoading } = useQuery({
    queryKey: ['today-arrivals'],
    queryFn: getTodayArrivals,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Today's Arrivals</h3>
          <p className="text-xs text-gray-500">
            {arrivals.length} practitioner{arrivals.length !== 1 ? 's' : ''} arrived
          </p>
        </div>
      </div>

      {arrivals.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No arrivals recorded yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Mark appointments as "Arrived" to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {arrivals.map((appointment) => (
            <button
              key={appointment.id}
              onClick={() => onAppointmentClick?.(appointment)}
              className="w-full text-left p-3 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {appointment.practitioner_name ?? 'Unassigned'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {appointment.patient_name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-purple-600">
                    {fmtArrivalTime(appointment.arrival_time)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Arrived
                  </p>
                </div>
              </div>
              {appointment.location_name && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{appointment.location_name}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};