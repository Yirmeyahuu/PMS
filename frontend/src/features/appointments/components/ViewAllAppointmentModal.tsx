import React from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment } from '@/types';

interface ViewAllAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  appointments: Appointment[];
}

const formatTime12Hour = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const ViewAllAppointmentModal: React.FC<ViewAllAppointmentModalProps> = ({
  isOpen,
  onClose,
  date,
  appointments
}) => {
  if (!isOpen) return null;

  // Sort appointments by time
  const sortedAppointments = [...appointments].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-600 bg-sky-500 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              Appointments
            </h2>
            <p className="text-sm text-sky-100 font-medium mt-0.5">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-sky-100 hover:text-white hover:bg-sky-600/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-[400px]">
          {sortedAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No appointments scheduled for this day.
            </div>
          ) : (
            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-sm relative">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm outline outline-1 outline-gray-200">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Patient Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Appointment Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Primary Practitioner
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Appointment Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAppointments.map((appt) => {
                    let isConfirmed = false;
                    
                    if (
                      appt.status === 'CONFIRMED' ||
                      appt.confirmation_status === 'CONFIRMED' ||
                      appt.has_invoice || 
                      appt.status === 'COMPLETED' || 
                      !!appt.notes || 
                      appt.arrival_status === 'ARRIVED' || 
                      appt.status === 'CHECKED_IN'
                    ) {
                      isConfirmed = true;
                    }

                    if (
                      appt.status === 'CANCELLED' ||
                      appt.status === 'DNA' ||
                      appt.arrival_status === 'DNA' ||
                      appt.status === 'NO_SHOW'
                    ) {
                      isConfirmed = false;
                    }

                    const statusText = isConfirmed ? 'Confirmed' : 'Not Confirmed';
                    const statusColor = isConfirmed ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-800 border-gray-200';
                    
                    return (
                      <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img 
                              src="/patient-default-profile/default-profile.jpg" 
                              alt="Patient Profile" 
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                            <div className="text-sm font-medium text-gray-900">
                              {appt.patient_name || 'Unknown Patient'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700 font-medium">
                            {formatTime12Hour(appt.start_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {appt.practitioner_name || 'Unassigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
