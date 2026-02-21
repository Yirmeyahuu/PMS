import React, { useRef, useState } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay } from 'date-fns';
import { useAppointmentModal } from './hooks/useAppointmentModal';
import { useDragSelection } from './hooks/useDragSelection';
import { useAppointments } from './hooks/useAppointments';
import { AppointmentModal } from './components/AppointmentModal';
import { AppointmentView } from './components/AppointmentView';
import { APPOINTMENT_STATUS_COLORS } from '@/types';
import type { Appointment } from '@/types';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarProps {
  view: CalendarView;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedPractitionerId: number | null;
  selectedClinicBranchId: number | null;
}

export const Calendar: React.FC<CalendarProps> = ({ view, currentDate, onDateChange, selectedPractitionerId, selectedClinicBranchId }) => {
  const { isOpen, selectedSlot, openModal, closeModal } = useAppointmentModal();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // ✅ Calculate date range based on view
  const getDateRange = () => {
    if (view === 'day') {
      return { startDate: currentDate, endDate: currentDate };
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return { startDate: weekStart, endDate: weekEnd };
    } else {
      // Month view - get full calendar range including days from previous/next month
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return { startDate, endDate };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { appointments, loading, refetch } = useAppointments({
    startDate,
    endDate,
    practitionerId: selectedPractitionerId,
    clinicBranchId: selectedClinicBranchId, // ✅ Pass clinic branch filter
  });

  const {
    selection,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    isSlotSelected,
    getSelectionDuration,
    getSelectionStartTime,
  } = useDragSelection();

  const isDraggingRef = useRef(false);
  const dragStartTimeRef = useRef<number>(0);

  // Generate time slots from 6 AM to 9 PM with 15-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 21; hour++) {
      const hourLabel = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      
      for (let quarter = 0; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        slots.push({
          hour,
          quarter,
          minutes,
          label: quarter === 0 ? `${hourLabel} ${period}` : '',
          time: `${hour}:${minutes.toString().padStart(2, '0')}`,
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Get appointments for a specific time slot
  const getAppointmentsForSlot = (date: Date, hour: number, minutes: number): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return appointments.filter(apt => {
      if (apt.date !== dateStr) return false;
      
      const slotTime = hour * 60 + minutes;
      const [startHour, startMin] = apt.start_time.split(':').map(Number);
      const [endHour, endMin] = apt.end_time.split(':').map(Number);
      const aptStart = startHour * 60 + startMin;
      const aptEnd = endHour * 60 + endMin;
      
      return slotTime >= aptStart && slotTime < aptEnd;
    });
  };

  // Get appointments for a specific day (for month view)
  const getAppointmentsForDay = (date: Date): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.date === dateStr);
  };

  // Calculate appointment position and height
  const getAppointmentStyle = (appointment: Appointment) => {
    const [startHour, startMin] = appointment.start_time.split(':').map(Number);
    const startSlotIndex = ((startHour - 6) * 4) + Math.floor(startMin / 15);
    const heightSlots = appointment.duration_minutes / 15;
    
    return {
      top: `${startSlotIndex * 1.25}rem`,
      height: `${heightSlots * 1.25}rem`,
    };
  };

  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsViewOpen(true);
  };

  const handleMouseDown = (date: Date, slot: any) => {
    isDraggingRef.current = false;
    dragStartTimeRef.current = Date.now();
    startSelection(slot);
  };

  const handleMouseEnter = (slot: any) => {
    if (selection.isSelecting) {
      const currentSlotIndex = slot.hour * 4 + slot.quarter;
      const startSlotIndex = selection.startSlot 
        ? selection.startSlot.hour * 4 + selection.startSlot.quarter 
        : -1;
      
      if (currentSlotIndex !== startSlotIndex) {
        isDraggingRef.current = true;
      }
      
      updateSelection(slot);
    }
  };

  const handleMouseUp = (date: Date) => {
    if (selection.startSlot) {
      const duration = getSelectionDuration();
      const startTime = getSelectionStartTime();

      if (isDraggingRef.current && duration > 15) {
        if (startTime) {
          openModal({
            date,
            time: `${startTime.hour}:${startTime.minutes.toString().padStart(2, '0')}`,
            hour: startTime.hour,
            minutes: startTime.minutes,
            duration,
          });
        }
      }
    }
    
    endSelection();
    clearSelection();
    isDraggingRef.current = false;
  };

  const handleDoubleClick = (date: Date, slot: any) => {
    openModal({
      date,
      time: slot.time,
      hour: slot.hour,
      minutes: slot.minutes,
      duration: 15,
    });
  };

  // Handle modal close and refresh
  const handleModalClose = () => {
    closeModal();
    refetch();
  };

  const handleViewClose = () => {
    setIsViewOpen(false);
    setSelectedAppointment(null);
  };

  const getWeekDays = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getMonthDays = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }

    return rows;
  };

  // Day View with Appointments
  if (view === 'day') {
    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
          </div>

          {/* Time Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[80px_1fr]">
              {/* Time Column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`
                      h-5 px-3 text-xs font-medium text-gray-500 text-right
                      flex items-center justify-end
                      ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                    `}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* Day Column with Appointments */}
              <div className="relative" onMouseUp={() => handleMouseUp(currentDate)}>
                {timeSlots.map((slot, index) => {
                  const isSelected = isSlotSelected(slot);
                  const slotsAppointments = getAppointmentsForSlot(currentDate, slot.hour, slot.minutes);
                  
                  return (
                    <div
                      key={index}
                      onMouseDown={() => handleMouseDown(currentDate, slot)}
                      onMouseEnter={() => handleMouseEnter(slot)}
                      onDoubleClick={() => handleDoubleClick(currentDate, slot)}
                      className={`
                        h-5 transition-colors cursor-pointer relative select-none
                        ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                        ${isSelected 
                          ? 'bg-sky-200 hover:bg-sky-300' 
                          : slotsAppointments.length > 0
                            ? 'bg-gray-50'
                            : 'hover:bg-sky-50'
                        }
                      `}
                      title={`Double-click for 15-min appointment, or click & drag to select duration`}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                      )}
                    </div>
                  );
                })}

                {/* Render Appointments */}
                {appointments
                  .filter(apt => format(new Date(apt.date), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd'))
                  .map((appointment) => {
                    const style = getAppointmentStyle(appointment);
                    const colors = APPOINTMENT_STATUS_COLORS[appointment.status];
                    
                    return (
                      <div
                        key={appointment.id}
                        className={`
                          absolute left-1 right-1 ${colors.bg} ${colors.border} border rounded-lg p-2
                          cursor-pointer hover:shadow-lg transition-shadow z-10
                          overflow-hidden
                        `}
                        style={style}
                        onClick={() => handleAppointmentClick(appointment)}
                      >
                        <div className={`text-xs font-semibold ${colors.text} truncate`}>
                          {appointment.patient_name}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {appointment.start_time} - {appointment.end_time}
                        </div>
                        {appointment.chief_complaint && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {appointment.chief_complaint}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={isOpen}
          onClose={handleModalClose}
          selectedSlot={selectedSlot}
        />

        {/* Appointment View Modal */}
        <AppointmentView
          isOpen={isViewOpen}
          onClose={handleViewClose}
          appointment={selectedAppointment}
          onEdit={(apt) => {
            console.log('Edit appointment:', apt);
          }}
          onDelete={(apt) => {
            console.log('Delete appointment:', apt);
          }}
        />
      </>
    );
  }

  // Week View with Drag Selection
  if (view === 'week') {
    const weekDays = getWeekDays(currentDate);

    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header with Days */}
          <div className="flex-shrink-0 grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
            <div className="p-4"></div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="p-4 text-center border-l border-gray-200"
              >
                <div className="text-xs font-medium text-gray-500 uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className="text-sm font-semibold text-gray-700 mt-1">
                  {format(day, 'd MMM')}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[80px_repeat(7,1fr)]">
              {/* Time Column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`
                      h-5 px-3 text-xs font-medium text-gray-500 text-right
                      flex items-center justify-end
                      ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                    `}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* Day Columns with Drag Selection */}
              {weekDays.map((day) => (
                <div 
                  key={day.toISOString()} 
                  className="border-l border-gray-200 relative"
                  onMouseUp={() => handleMouseUp(day)}
                >
                  {timeSlots.map((slot, index) => {
                    const isSelected = isSlotSelected(slot);
                    
                    return (
                      <div
                        key={index}
                        onMouseDown={() => handleMouseDown(day, slot)}
                        onMouseEnter={() => handleMouseEnter(slot)}
                        onDoubleClick={() => handleDoubleClick(day, slot)}
                        className={`
                          h-5 transition-colors cursor-pointer relative select-none
                          ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                          ${isSelected 
                            ? 'bg-sky-200 hover:bg-sky-300' 
                            : 'hover:bg-sky-50'
                          }
                        `}
                        title={`Double-click for 15-min appointment, or click & drag to select duration`}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}

                  {/* Render Appointments for Week View */}
                  {appointments
                    .filter(apt => format(new Date(apt.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                    .map((appointment) => {
                      const style = getAppointmentStyle(appointment);
                      const colors = APPOINTMENT_STATUS_COLORS[appointment.status];
                      
                      return (
                        <div
                          key={appointment.id}
                          className={`
                            absolute left-1 right-1 ${colors.bg} ${colors.border} border rounded-lg p-1
                            cursor-pointer hover:shadow-lg transition-shadow z-10
                            overflow-hidden
                          `}
                          style={style}
                          onClick={() => handleAppointmentClick(appointment)}
                        >
                          <div className={`text-xs font-semibold ${colors.text} truncate`}>
                            {appointment.patient_name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {appointment.start_time}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={isOpen}
          onClose={handleModalClose}
          selectedSlot={selectedSlot}
        />

        {/* Appointment View Modal */}
        <AppointmentView
          isOpen={isViewOpen}
          onClose={handleViewClose}
          appointment={selectedAppointment}
        />
      </>
    );
  }

  // Month View with Appointments
  if (view === 'month') {
    const monthDays = getMonthDays(currentDate);
    const weekDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex-shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekDayNames.map((day) => (
            <div
              key={day}
              className="p-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {monthDays.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
              {week.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const hasAppointments = dayAppointments.length > 0;
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => onDateChange(day)}
                    className={`
                      min-h-[120px] p-2 border-r border-gray-200 last:border-r-0
                      hover:bg-sky-50 transition-colors cursor-pointer
                      ${!isSameMonth(day, currentDate) ? 'bg-gray-50' : ''}
                      ${isSameDay(day, new Date()) ? 'bg-sky-50' : ''}
                    `}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`
                          text-sm font-medium
                          ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}
                          ${isSameDay(day, new Date()) ? 'bg-sky-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </div>
                      
                      {/* Appointment Count Badge */}
                      {hasAppointments && (
                        <div className="bg-sky-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                          {dayAppointments.length}
                        </div>
                      )}
                    </div>

                    {/* Appointments List */}
                    <div className="space-y-1 mt-2">
                      {dayAppointments.slice(0, 3).map((appointment) => {
                        const colors = APPOINTMENT_STATUS_COLORS[appointment.status];
                        
                        return (
                          <div
                            key={appointment.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(appointment);
                            }}
                            className={`
                              ${colors.bg} ${colors.border} border rounded px-2 py-1
                              hover:shadow-md transition-shadow
                            `}
                          >
                            <div className={`text-xs font-semibold ${colors.text} truncate`}>
                              {appointment.start_time} - {appointment.patient_name}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show "+X more" if there are more than 3 appointments */}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium px-2">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Appointment View Modal */}
        <AppointmentView
          isOpen={isViewOpen}
          onClose={handleViewClose}
          appointment={selectedAppointment}
        />
      </div>
    );
  }

  return null;
};