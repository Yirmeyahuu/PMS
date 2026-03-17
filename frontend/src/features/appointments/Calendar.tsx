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
import { APPOINTMENT_STATUS_COLORS } from '@/types';
import type { Appointment }          from '@/types';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarProps {
  view:                   CalendarView;
  currentDate:            Date;
  onDateChange:           (date: Date) => void;
  selectedPractitionerId: number | null;
  selectedClinicBranchId: number | null;
}

// ── Hex color helpers ──────────────────────────────────────────────────────────
/**
 * Given a hex color string, returns a slightly transparent version for backgrounds
 * and the original for borders/accents.
 */
const hexToRgba = (hex: string, alpha: number): string => {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Determines if a hex color is "dark" so we can pick contrasting text.
 */
const isColorDark = (hex: string): boolean => {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

type BlockColors =
  | {
      useHex:  true;
      hex:     string;
      bgStyle: React.CSSProperties;
      textColor: string;
      subTextColor: string;
      label:   string | null;
    }
  | {
      useHex:  false;
      hex:     null;
      bg:      string;
      border:  string;
      text:    string;
      label:   string | null;
    };

export const Calendar: React.FC<CalendarProps> = ({
  view,
  currentDate,
  onDateChange,
  selectedPractitionerId,
  selectedClinicBranchId,
}) => {
  const { isOpen, selectedSlot, openModal, closeModal } = useAppointmentModal();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewOpen,           setIsViewOpen]           = useState(false);

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

  // ── Service-aware block colors ─────────────────────────────────────────────
  const getBlockColors = (apt: Appointment): BlockColors => {
    if (apt.service_color) {
      const dark = isColorDark(apt.service_color);
      return {
        useHex: true,
        hex:    apt.service_color,
        bgStyle: {
          backgroundColor: hexToRgba(apt.service_color, 0.15),
          borderColor:     apt.service_color,
          borderLeftWidth: '3px',
          borderLeftColor: apt.service_color,
        },
        textColor:    dark ? apt.service_color : apt.service_color,
        subTextColor: apt.service_color,
        label: apt.service_name ?? apt.chief_complaint ?? null,
      };
    }
    const c = APPOINTMENT_STATUS_COLORS[apt.status];
    return {
      useHex: false,
      hex:    null,
      bg:     c.bg,
      border: c.border,
      text:   c.text,
      label:  apt.chief_complaint ?? null,
    };
  };

  const { startDate, endDate } = getDateRange();

  const {
    appointments,
    loading,
    refetch,
    updateAppointmentInState,
  } = useAppointments({
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

  const getAppointmentStyle = (apt: Appointment) => {
    const [sH, sM] = apt.start_time.split(':').map(Number);
    const startSlotIndex = (sH - 6) * 4 + Math.floor(sM / 15);
    return {
      top:    `${startSlotIndex * 1.25}rem`,
      height: `${Math.max((apt.duration_minutes / 15) * 1.25, 1.25)}rem`,
    };
  };

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsViewOpen(true);
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

  const handleModalClose = () => {
    closeModal();
    setTimeout(() => refetch(), 300);
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
    const monthStart = startOfMonth(currentDate);
    const monthEnd   = endOfMonth(currentDate);
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

  // ── Shared modals ─────────────────────────────────────────────────────────
  const sharedModals = (
    <>
      <AppointmentModal
        isOpen={isOpen}
        onClose={handleModalClose}
        selectedSlot={selectedSlot}
      />
      <AppointmentView
        isOpen={isViewOpen}
        onClose={handleViewClose}
        appointment={selectedAppointment}
        onUpdated={(updated) => {
          updateAppointmentInState(updated);
          setSelectedAppointment(updated);
        }}
      />
    </>
  );

  // ── Appointment Card — Day/Week ────────────────────────────────────────────
  const renderTimelineCard = (apt: Appointment, compact = false) => {
    const style = getAppointmentStyle(apt);
    const col   = getBlockColors(apt);

    const containerStyle: React.CSSProperties = {
      ...style,
      position: 'absolute',
      left: '4px',
      right: '4px',
      zIndex: 10,
      overflow: 'hidden',
      borderRadius: '8px',
      border: '1px solid',
      padding: compact ? '2px 6px' : '6px 8px',
      cursor: 'pointer',
      transition: 'filter 0.15s',
      ...(col.useHex ? col.bgStyle : {}),
    };

    return (
      <div
        key={apt.id}
        style={containerStyle}
        onClick={() => handleAppointmentClick(apt)}
        className={`hover:brightness-95 ${!col.useHex ? `${col.bg} ${col.border}` : ''}`}
      >
        {/* Color accent dot for service */}
        {col.useHex && (
          <div
            className="absolute top-0 left-0 bottom-0 w-1 rounded-l-lg"
            style={{ backgroundColor: col.hex }}
          />
        )}

        <div className={compact ? 'pl-2' : 'pl-2'}>
          <div
            className="text-xs font-semibold truncate"
            style={col.useHex ? { color: col.hex } : { color: undefined }}
          >
            <span className={!col.useHex ? col.text : ''}>
              {apt.patient_name}
            </span>
          </div>

          {!compact && (
            <div
              className="text-xs truncate mt-0.5"
              style={col.useHex ? { color: hexToRgba(col.hex, 0.75) } : {}}
            >
              <span className={!col.useHex ? 'text-gray-600' : ''}>
                {apt.start_time} – {apt.end_time}
              </span>
            </div>
          )}

          {compact && (
            <div
              className="text-xs truncate"
              style={col.useHex ? { color: hexToRgba(col.hex, 0.75) } : {}}
            >
              <span className={!col.useHex ? 'text-gray-600' : ''}>
                {apt.start_time}
              </span>
            </div>
          )}

          {col.label && !compact && (
            <div
              className="text-xs truncate mt-1 font-medium"
              style={col.useHex ? { color: hexToRgba(col.hex, 0.85) } : {}}
            >
              <span className={!col.useHex ? 'text-gray-500' : ''}>
                {col.label}
              </span>
            </div>
          )}

          {col.label && compact && (
            <div
              className="text-xs truncate"
              style={col.useHex ? { color: hexToRgba(col.hex, 0.85) } : {}}
            >
              <span className={!col.useHex ? 'text-gray-500' : ''}>
                {col.label}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Appointment Card — Month ───────────────────────────────────────────────
  const renderMonthCard = (apt: Appointment) => {
    const col = getBlockColors(apt);

    const containerStyle: React.CSSProperties = col.useHex
      ? {
          backgroundColor: hexToRgba(col.hex, 0.12),
          borderColor:     col.hex,
          borderLeftColor: col.hex,
          borderLeftWidth: '3px',
        }
      : {};

    return (
      <div
        key={apt.id}
        onClick={e => { e.stopPropagation(); handleAppointmentClick(apt); }}
        style={containerStyle}
        className={`
          border rounded px-2 py-1 cursor-pointer transition-all hover:brightness-95
          ${!col.useHex ? `${col.bg} ${col.border}` : ''}
        `}
      >
        <div
          className="text-xs font-semibold truncate"
          style={col.useHex ? { color: col.hex } : {}}
        >
          <span className={!col.useHex ? col.text : ''}>
            {apt.start_time} · {apt.patient_name}
          </span>
        </div>

        {apt.service_name && (
          <div
            className="text-xs truncate mt-0.5"
            style={col.useHex ? { color: hexToRgba(col.hex, 0.75) } : {}}
          >
            <span className={!col.useHex ? 'text-gray-500' : ''}>
              {apt.service_name}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── DAY VIEW ───────────────────────────────────────────────────────────────
  if (view === 'day') {
    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
          </div>

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
                  const slotAppointments = getAppointmentsForSlot(currentDate, slot.hour, slot.minutes);
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
                          : slotAppointments.length > 0
                            ? 'bg-gray-50'
                            : 'hover:bg-sky-50'
                        }
                      `}
                      title="Double-click for 15-min appointment, or drag to select duration"
                    >
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                      )}
                    </div>
                  );
                })}

                {/* Appointments */}
                {appointments
                  .filter(apt => apt.date === format(currentDate, 'yyyy-MM-dd'))
                  .map(apt => renderTimelineCard(apt, false))
                }
              </div>
            </div>
          </div>
        </div>

        {sharedModals}
      </>
    );
  }

  // ── WEEK VIEW ──────────────────────────────────────────────────────────────
  if (view === 'week') {
    const weekDays = getWeekDays(currentDate);

    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Week header */}
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
                        title="Double-click for 15-min appointment, or drag to select duration"
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}

                  {/* Appointments */}
                  {appointments
                    .filter(apt => apt.date === format(day, 'yyyy-MM-dd'))
                    .map(apt => renderTimelineCard(apt, true))
                  }
                </div>
              ))}
            </div>
          </div>
        </div>

        {sharedModals}
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

          {/* Month header */}
          <div className="flex-shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {weekDayNames.map(d => (
              <div
                key={d}
                className="p-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {monthDays.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
                {week.map(day => {
                  const dayAppts = getAppointmentsForDay(day);
                  const count    = dayAppts.length;

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
                      {/* Date + badge row */}
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

                        {count > 0 && (
                          <div className="bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                            {count}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 mt-2">
                        {dayAppts.slice(0, 3).map(apt => renderMonthCard(apt))}

                        {count > 3 && (
                          <div className="text-xs text-gray-500 font-medium px-2">
                            +{count - 3} more
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

        {sharedModals}
      </>
    );
  }

  return null;
};