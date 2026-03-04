import React, { useRef, useState } from 'react';
import {
  format, startOfWeek, addDays,
  startOfMonth, endOfMonth, endOfWeek,
  isSameMonth, isSameDay,
} from 'date-fns';
import { useAppointmentModal }  from './hooks/useAppointmentModal';
import { useDragSelection }     from './hooks/useDragSelection';
import { useAppointments }      from './hooks/useAppointments';
import { AppointmentModal }     from './components/AppointmentModal';
import { AppointmentView }      from './components/AppointmentView';
import { AppointmentConfirmationModal } from './components/AppointmentConfirmationModal';
import { APPOINTMENT_STATUS_COLORS }   from '@/types';
import type { Appointment }            from '@/types';
import type { PortalBookingDiaryItem } from './appointment.api';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarProps {
  view:                   CalendarView;
  currentDate:            Date;
  onDateChange:           (date: Date) => void;
  selectedPractitionerId: number | null;
  selectedClinicBranchId: number | null;
}

export const Calendar: React.FC<CalendarProps> = ({
  view,
  currentDate,
  onDateChange,
  selectedPractitionerId,
  selectedClinicBranchId,
}) => {
  const { isOpen, selectedSlot, openModal, closeModal } = useAppointmentModal();

  const [selectedAppointment,  setSelectedAppointment]  = useState<Appointment | null>(null);
  const [isViewOpen,           setIsViewOpen]           = useState(false);
  const [selectedPortalBooking, setSelectedPortalBooking] = useState<PortalBookingDiaryItem | null>(null);
  const [isConfirmModalOpen,   setIsConfirmModalOpen]   = useState(false);

  // ── Date range ──────────────────────────────────────────────────────────────
  const getDateRange = () => {
    if (view === 'day') {
      return { startDate: currentDate, endDate: currentDate };
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return { startDate: weekStart, endDate: addDays(weekStart, 6) };
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd   = endOfMonth(currentDate);
      return {
        startDate: startOfWeek(monthStart, { weekStartsOn: 1 }),
        endDate:   endOfWeek(monthEnd,     { weekStartsOn: 1 }),
      };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { appointments, portalBookings, loading, refetch } = useAppointments({
    startDate,
    endDate,
    practitionerId: selectedPractitionerId,
    clinicBranchId: selectedClinicBranchId,
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

  const isDraggingRef    = useRef(false);
  const dragStartTimeRef = useRef<number>(0);

  // ── Time slots 6 AM – 9 PM ────────────────────────────────────────────────
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 21; hour++) {
      const hourLabel = hour > 12 ? hour - 12 : hour;
      const period    = hour >= 12 ? 'PM' : 'AM';
      for (let quarter = 0; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        slots.push({
          hour,
          quarter,
          minutes,
          label: quarter === 0 ? `${hourLabel} ${period}` : '',
          time:  `${hour}:${minutes.toString().padStart(2, '0')}`,
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getAppointmentsForSlot = (date: Date, hour: number, minutes: number): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => {
      if (apt.date !== dateStr) return false;
      const slotTime = hour * 60 + minutes;
      const [sH, sM] = apt.start_time.split(':').map(Number);
      const [eH, eM] = apt.end_time.split(':').map(Number);
      return slotTime >= sH * 60 + sM && slotTime < eH * 60 + eM;
    });
  };

  const getAppointmentsForDay = (date: Date): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.date === dateStr);
  };

  const getPortalBookingsForDay = (date: Date): PortalBookingDiaryItem[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return portalBookings.filter(b => b.date === dateStr);
  };

  const getAppointmentStyle = (apt: Appointment) => {
    const [sH, sM] = apt.start_time.split(':').map(Number);
    const startSlotIndex = (sH - 6) * 4 + Math.floor(sM / 15);
    return {
      top:    `${startSlotIndex * 1.25}rem`,
      height: `${Math.max((apt.duration_minutes / 15) * 1.25, 1.25)}rem`,
    };
  };

  const getPortalBookingStyle = (b: PortalBookingDiaryItem) => {
    const [sH, sM] = b.start_time.split(':').map(Number);
    const startSlotIndex = (sH - 6) * 4 + Math.floor(sM / 15);
    return {
      top:    `${startSlotIndex * 1.25}rem`,
      height: `${Math.max((b.duration_minutes / 15) * 1.25, 1.25)}rem`,
    };
  };

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsViewOpen(true);
  };

  const handlePortalBookingClick = (booking: PortalBookingDiaryItem) => {
    setSelectedPortalBooking(booking);
    setIsConfirmModalOpen(true);
  };

  const handleMouseDown = (date: Date, slot: any) => {
    isDraggingRef.current    = false;
    dragStartTimeRef.current = Date.now();
    startSelection(slot);
  };

  const handleMouseEnter = (slot: any) => {
    if (selection.isSelecting) {
      const cur   = slot.hour * 4 + slot.quarter;
      const start = selection.startSlot
        ? selection.startSlot.hour * 4 + selection.startSlot.quarter
        : -1;
      if (cur !== start) isDraggingRef.current = true;
      updateSelection(slot);
    }
  };

  const handleMouseUp = (date: Date) => {
    if (selection.startSlot) {
      const duration  = getSelectionDuration();
      const startTime = getSelectionStartTime();
      if (isDraggingRef.current && duration > 15 && startTime) {
        openModal({
          date,
          time:    `${startTime.hour}:${startTime.minutes.toString().padStart(2, '0')}`,
          hour:    startTime.hour,
          minutes: startTime.minutes,
          duration,
        });
      }
    }
    endSelection();
    clearSelection();
    isDraggingRef.current = false;
  };

  const handleDoubleClick = (date: Date, slot: any) => {
    openModal({ date, time: slot.time, hour: slot.hour, minutes: slot.minutes, duration: 15 });
  };

  const handleModalClose = () => { closeModal(); refetch(); };
  const handleViewClose  = () => { setIsViewOpen(false); setSelectedAppointment(null); };
  const handleConfirmClose = () => { setIsConfirmModalOpen(false); setSelectedPortalBooking(null); };

  const getWeekDays = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getMonthDays = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd   = endOfMonth(date);
    const start      = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end        = endOfWeek(monthEnd,     { weekStartsOn: 1 });
    const rows: Date[][] = [];
    let days: Date[]     = [];
    let day = start;
    while (day <= end) {
      for (let i = 0; i < 7; i++) { days.push(day); day = addDays(day, 1); }
      rows.push(days);
      days = [];
    }
    return rows;
  };

  // ── Shared portal booking block renderer (day + week) ─────────────────────
  const renderPortalBlock = (booking: PortalBookingDiaryItem) => {
    const isPending = booking.status === 'PENDING';
    return (
      <div
        key={`portal-${booking.id}`}
        style={getPortalBookingStyle(booking)}
        onClick={() => handlePortalBookingClick(booking)}
        className={`
          absolute left-1 right-1 border rounded-lg p-1.5
          cursor-pointer hover:shadow-lg transition-shadow z-10 overflow-hidden
          ${isPending
            ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
            : 'bg-sky-50 border-sky-300 hover:bg-sky-100'
          }
        `}
      >
        {/* Animated pending dot */}
        {isPending && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
        )}
        <div className={`text-xs font-semibold truncate pr-4 ${isPending ? 'text-orange-700' : 'text-sky-700'}`}>
          {booking.patient_name}
        </div>
        <div className={`text-xs truncate ${isPending ? 'text-orange-500' : 'text-sky-500'}`}>
          {booking.start_time} · {booking.service_name}
        </div>
        <div className={`text-xs font-medium mt-0.5 ${isPending ? 'text-orange-400' : 'text-sky-400'}`}>
          {isPending ? '● Portal — Pending' : '● Portal — Confirmed'}
        </div>
      </div>
    );
  };

  // ── DAY VIEW ───────────────────────────────────────────────────────────────
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

              {/* Time column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {timeSlots.map((slot, i) => (
                  <div
                    key={i}
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

              {/* Day column */}
              <div className="relative" onMouseUp={() => handleMouseUp(currentDate)}>
                {timeSlots.map((slot, i) => {
                  const isSelected       = isSlotSelected(slot);
                  const slotsAppointments = getAppointmentsForSlot(currentDate, slot.hour, slot.minutes);
                  return (
                    <div
                      key={i}
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
                      title="Double-click for 15-min appointment, or click & drag to select duration"
                    >
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                      )}
                    </div>
                  );
                })}

                {/* Diary appointments */}
                {appointments
                  .filter(apt => apt.date === format(currentDate, 'yyyy-MM-dd'))
                  .map(apt => {
                    const style  = getAppointmentStyle(apt);
                    const colors = APPOINTMENT_STATUS_COLORS[apt.status];
                    return (
                      <div
                        key={apt.id}
                        style={style}
                        onClick={() => handleAppointmentClick(apt)}
                        className={`
                          absolute left-1 right-1 ${colors.bg} ${colors.border} border
                          rounded-lg p-2 cursor-pointer hover:shadow-lg transition-shadow z-10 overflow-hidden
                        `}
                      >
                        <div className={`text-xs font-semibold ${colors.text} truncate`}>
                          {apt.patient_name}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {apt.start_time} - {apt.end_time}
                        </div>
                        {apt.chief_complaint && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {apt.chief_complaint}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Portal bookings */}
                {getPortalBookingsForDay(currentDate).map(renderPortalBlock)}
              </div>
            </div>
          </div>
        </div>

        <AppointmentModal isOpen={isOpen} onClose={handleModalClose} selectedSlot={selectedSlot} />
        <AppointmentView
          isOpen={isViewOpen}
          onClose={handleViewClose}
          appointment={selectedAppointment}
          onEdit={(apt) => console.log('Edit:', apt)}
          onDelete={(apt) => console.log('Delete:', apt)}
        />
        <AppointmentConfirmationModal
          isOpen={isConfirmModalOpen}
          booking={selectedPortalBooking}
          onClose={handleConfirmClose}
          onUpdated={refetch}
        />
      </>
    );
  }

  // ── WEEK VIEW ──────────────────────────────────────────────────────────────
  if (view === 'week') {
    const weekDays = getWeekDays(currentDate);

    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="flex-shrink-0 grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
            <div className="p-4" />
            {weekDays.map(day => (
              <div key={day.toISOString()} className="p-4 text-center border-l border-gray-200">
                <div className="text-xs font-medium text-gray-500 uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className={`
                  text-sm font-semibold mt-1
                  ${isSameDay(day, new Date())
                    ? 'bg-sky-600 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs'
                    : 'text-gray-700'
                  }
                `}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[80px_repeat(7,1fr)]">

              {/* Time column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {timeSlots.map((slot, i) => (
                  <div
                    key={i}
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

              {/* Day columns */}
              {weekDays.map(day => (
                <div
                  key={day.toISOString()}
                  className="border-l border-gray-200 relative"
                  onMouseUp={() => handleMouseUp(day)}
                >
                  {timeSlots.map((slot, i) => {
                    const isSelected = isSlotSelected(slot);
                    return (
                      <div
                        key={i}
                        onMouseDown={() => handleMouseDown(day, slot)}
                        onMouseEnter={() => handleMouseEnter(slot)}
                        onDoubleClick={() => handleDoubleClick(day, slot)}
                        className={`
                          h-5 transition-colors cursor-pointer relative select-none
                          ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                          ${isSelected ? 'bg-sky-200 hover:bg-sky-300' : 'hover:bg-sky-50'}
                        `}
                        title="Double-click for 15-min appointment, or click & drag to select duration"
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}

                  {/* Diary appointments */}
                  {appointments
                    .filter(apt => apt.date === format(day, 'yyyy-MM-dd'))
                    .map(apt => {
                      const style  = getAppointmentStyle(apt);
                      const colors = APPOINTMENT_STATUS_COLORS[apt.status];
                      return (
                        <div
                          key={apt.id}
                          style={style}
                          onClick={() => handleAppointmentClick(apt)}
                          className={`
                            absolute left-1 right-1 ${colors.bg} ${colors.border} border
                            rounded-lg p-1 cursor-pointer hover:shadow-lg transition-shadow z-10 overflow-hidden
                          `}
                        >
                          <div className={`text-xs font-semibold ${colors.text} truncate`}>
                            {apt.patient_name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">{apt.start_time}</div>
                        </div>
                      );
                    })}

                  {/* Portal bookings */}
                  {getPortalBookingsForDay(day).map(renderPortalBlock)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <AppointmentModal isOpen={isOpen} onClose={handleModalClose} selectedSlot={selectedSlot} />
        <AppointmentView isOpen={isViewOpen} onClose={handleViewClose} appointment={selectedAppointment} />
        <AppointmentConfirmationModal
          isOpen={isConfirmModalOpen}
          booking={selectedPortalBooking}
          onClose={handleConfirmClose}
          onUpdated={refetch}
        />
      </>
    );
  }

  // ── MONTH VIEW ─────────────────────────────────────────────────────────────
  if (view === 'month') {
    const monthDays    = getMonthDays(currentDate);
    const weekDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Header row */}
          <div className="flex-shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {weekDayNames.map(d => (
              <div key={d} className="p-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {monthDays.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
                {week.map(day => {
                  const dayAppts   = getAppointmentsForDay(day);
                  const dayPortal  = getPortalBookingsForDay(day);
                  const totalCount = dayAppts.length + dayPortal.length;
                  const pendingCount = dayPortal.filter(b => b.status === 'PENDING').length;

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
                      {/* Date + badges row */}
                      <div className="flex items-center justify-between mb-1">
                        <div className={`
                          text-sm font-medium
                          ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}
                          ${isSameDay(day, new Date())
                            ? 'bg-sky-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold'
                            : ''
                          }
                        `}>
                          {format(day, 'd')}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Pending portal badge (orange) */}
                          {pendingCount > 0 && (
                            <div className="bg-orange-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              {pendingCount}
                            </div>
                          )}
                          {/* Total count badge (sky) */}
                          {totalCount > 0 && (
                            <div className="bg-sky-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                              {totalCount}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 mt-2">
                        {/* Diary appointments (up to 2) */}
                        {dayAppts.slice(0, 2).map(apt => {
                          const colors = APPOINTMENT_STATUS_COLORS[apt.status];
                          return (
                            <div
                              key={apt.id}
                              onClick={e => { e.stopPropagation(); handleAppointmentClick(apt); }}
                              className={`${colors.bg} ${colors.border} border rounded px-2 py-1 hover:shadow-md transition-shadow`}
                            >
                              <div className={`text-xs font-semibold ${colors.text} truncate`}>
                                {apt.start_time} - {apt.patient_name}
                              </div>
                            </div>
                          );
                        })}

                        {/* Portal bookings (up to 1) */}
                        {dayPortal.slice(0, 1).map(booking => {
                          const isPending = booking.status === 'PENDING';
                          return (
                            <div
                              key={`portal-${booking.id}`}
                              onClick={e => { e.stopPropagation(); handlePortalBookingClick(booking); }}
                              className={`
                                border rounded px-2 py-1 hover:shadow-md transition-shadow
                                ${isPending
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-sky-50 border-sky-300'
                                }
                              `}
                            >
                              <div className={`text-xs font-semibold truncate flex items-center gap-1 ${
                                isPending ? 'text-orange-700' : 'text-sky-700'
                              }`}>
                                {isPending && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                                )}
                                {booking.start_time} - {booking.patient_name}
                              </div>
                              <div className={`text-xs truncate ${isPending ? 'text-orange-400' : 'text-sky-400'}`}>
                                {booking.service_name}
                              </div>
                            </div>
                          );
                        })}

                        {/* +X more */}
                        {totalCount > 3 && (
                          <div className="text-xs text-gray-500 font-medium px-2">
                            +{totalCount - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <AppointmentView isOpen={isViewOpen} onClose={handleViewClose} appointment={selectedAppointment} />
        <AppointmentConfirmationModal
          isOpen={isConfirmModalOpen}
          booking={selectedPortalBooking}
          onClose={handleConfirmClose}
          onUpdated={refetch}
        />
      </>
    );
  }

  return null;
};