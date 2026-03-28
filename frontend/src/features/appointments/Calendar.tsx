import React, { useRef, useState, useCallback } from 'react';
import {
  format, startOfWeek, addDays,
  startOfMonth, endOfMonth, endOfWeek,
  isSameMonth, isSameDay,
} from 'date-fns';
import { useAppointmentModal }   from './hooks/useAppointmentModal';
import { useDragSelection }      from './hooks/useDragSelection';
import { useAppointments }       from './hooks/useAppointments';
import { useBlockAppointments }  from './hooks/useBlockAppointments';
import { useBlockHover }         from './hooks/useBlockHover';
import { useAppointmentDrag }    from './hooks/useAppointmentDrag';
import { useBlockAppointmentDrag } from './hooks/useBlockAppointmentDrag';
import { useAppointmentHover }   from './hooks/useAppointmentHover';
import { useBlockConflictDetection } from './hooks/useBlockConflictDetection';
import { AppointmentModal }      from './components/AppointmentModal';
import { AppointmentView }       from './components/AppointmentView';
import { AppointmentHoverCard }  from './components/AppointmentHoverCard';
import { BlockHoverCard }        from './components/BlockHoverCard';
import { ConflictModal }         from './components/ConflictModal';
import { APPOINTMENT_STATUS_COLORS } from '@/types';
import type { Appointment, BlockAppointment } from '@/types';
import { rescheduleAppointment }      from './appointment.api';
import { updateBlockAppointment }     from './appointment.api';
import toast                          from 'react-hot-toast';

type CalendarView = 'day' | 'week' | 'month'; 

interface CalendarProps {
  view:                   CalendarView;
  currentDate:            Date;
  onDateChange:           (date: Date) => void;
  selectedPractitionerId: number | null;
  selectedClinicBranchId: number | null;
  refreshKey?: number; // Used to trigger refresh when events are created
  onEventClick?: (event: BlockAppointment) => void; // Callback when admin clicks on a block event
  onAppointmentsReady?: (appointments: Appointment[]) => void; // Callback to expose appointments to parent
  onCalendarReady?: (date: Date) => void; // Callback when calendar has loaded with current date
}

const hexToRgba = (hex: string, alpha: number): string => {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// isColorDark removed — was declared but never used

type BlockColors =
  | { useHex: true;  hex: string; bgStyle: React.CSSProperties; textColor: string; subTextColor: string; label: string | null; }
  | { useHex: false; hex: null;   bg: string; border: string; text: string; label: string | null; };

// ── Drag Ghost Overlay ────────────────────────────────────────────────────────
interface DragGhostProps {
  appointment: Appointment;
  position:    { x: number; y: number };
}

const DragGhost: React.FC<DragGhostProps> = ({ appointment, position }) => (
  <div
    className="fixed pointer-events-none z-[9999] opacity-90 shadow-2xl"
    style={{
      left:      position.x - 80,
      top:       position.y - 20,
      width:     160,
      transform: 'rotate(2deg)',
    }}
  >
    <div className="bg-sky-500 text-white rounded-lg px-3 py-2 text-xs font-semibold shadow-lg border-2 border-sky-300">
      <div className="truncate">{appointment.patient_name}</div>
      <div className="text-sky-200 mt-0.5 truncate">
        {appointment.start_time} · {appointment.service_name ?? appointment.appointment_type}
      </div>
      <div className="mt-1 flex items-center gap-1 text-sky-100">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Drop to reschedule
      </div>
    </div>
  </div>
);

// ── Hold Progress Ring ────────────────────────────────────────────────────────
interface HoldRingProps {
  progress: number;
  position: { x: number; y: number };
}

const HoldRing: React.FC<HoldRingProps> = ({ progress, position }) => {
  const radius        = 22;
  const stroke        = 3;
  const normalised    = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalised;
  const offset        = circumference - (progress / 100) * circumference;

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{ left: position.x - 26, top: position.y - 26 }}
    >
      <svg width={52} height={52}>
        <circle cx={26} cy={26} r={normalised} fill="rgba(255,255,255,0.85)" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={26} cy={26} r={normalised}
          fill="none" stroke="#0ea5e9" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
        <text x={26} y={30} textAnchor="middle" fontSize={12}>✋</text>
      </svg>
    </div>
  );
};

export const Calendar: React.FC<CalendarProps> = ({
  view,
  currentDate,
  onDateChange,
  selectedPractitionerId,
  selectedClinicBranchId,
  refreshKey,
  onEventClick,
  onAppointmentsReady,
  onCalendarReady,
}) => {
  const { isOpen, selectedSlot, openModal, closeModal } = useAppointmentModal();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewOpen,           setIsViewOpen]           = useState(false);

  // ── Hover card ────────────────────────────────────────────────────────────
  const {
    hoverState,
    onMouseEnter:   onCardMouseEnter,
    onMouseLeave:   onCardMouseLeave,
    onPopoverEnter: onHoverCardEnter,
    onPopoverLeave: onHoverCardLeave,
    hideHover,
  } = useAppointmentHover();

  // ── Block hover card ───────────────────────────────────────────────────────────
  const {
    blockHoverState,
    onBlockMouseEnter,
    onBlockMouseLeave,
    onBlockPopoverEnter,
    onBlockPopoverLeave,
    hideBlockHover,
  } = useBlockHover();

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

  const getBlockColors = (apt: Appointment): BlockColors => {
    // Check if appointment has an invoice - use orange color
    if (apt.has_invoice) {
      const orangeHex = '#f97316';
      return {
        useHex: true,
        hex:    orangeHex,
        bgStyle: {
          backgroundColor: hexToRgba(orangeHex, 0.15),
          borderColor:     orangeHex,
          borderLeftWidth: '3px',
          borderLeftColor: orangeHex,
        },
        textColor:    orangeHex,
        subTextColor: orangeHex,
        label: apt.service_name ?? apt.chief_complaint ?? null,
      };
    }
    // Check if appointment has arrived - use purple color
    if (apt.arrival_status === 'ARRIVED') {
      const purpleHex = '#8B5CF6';
      return {
        useHex: true,
        hex:    purpleHex,
        bgStyle: {
          backgroundColor: hexToRgba(purpleHex, 0.15),
          borderColor:     purpleHex,
          borderLeftWidth: '3px',
          borderLeftColor: purpleHex,
        },
        textColor:    purpleHex,
        subTextColor: purpleHex,
        label: apt.service_name ?? apt.chief_complaint ?? null,
      };
    }
    if (apt.service_color) {
      return {
        useHex: true,
        hex:    apt.service_color,
        bgStyle: {
          backgroundColor: hexToRgba(apt.service_color, 0.15),
          borderColor:     apt.service_color,
          borderLeftWidth: '3px',
          borderLeftColor: apt.service_color,
        },
        textColor:    apt.service_color,
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
    updateAppointmentInState,
    addAppointmentToState,
  } = useAppointments({
    startDate,
    endDate,
    practitionerId: selectedPractitionerId,
    clinicBranchId: selectedClinicBranchId,
  });

  // ── Block Appointments (Events) ───────────────────────────────────────────────
  // Fetch ALL block appointments regardless of selected branch so they're visible to all branches
  const {
    blockAppointments,
    addBlockAppointmentToState,
    updateBlockAppointmentInState,
    removeBlockAppointmentFromState,
    refetch: refetchBlockAppointments,
  } = useBlockAppointments({
    startDate,
    endDate,
    clinicBranchId: null, // Always fetch all block appointments - they're visible to all branches
  });

  // ── Conflict detection for block appointments (must be after appointments is defined) ─────────────────────────────────
  const { getFirstConflict } = useBlockConflictDetection(appointments);
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    type: 'appointment' | 'block';
    appointment?: Appointment;
    block?: BlockAppointment;
    newDate:     Date;
    newHour:     number;
    newMinutes:  number;
  } | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // ── Conflict detection state ─────────────────────────────────────────────────
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingAppointment, setConflictingAppointment] = useState<{
    appointment: Appointment;
    blockStartTime: string;
    blockEndTime: string;
  } | null>(null);
  const [pendingBlockDrop, setPendingBlockDrop] = useState<{
    block: BlockAppointment;
    newDate: Date;
    newHour: number;
    newMinutes: number;
  } | null>(null);

  // Use refreshKey to trigger re-fetch when events are created
  React.useEffect(() => {
    console.log('[Calendar] refreshKey effect:', refreshKey);
    if (refreshKey && refreshKey > 0) {
      console.log('[Calendar] Calling refetchBlockAppointments');
      refetchBlockAppointments();
    }
  }, [refreshKey, refetchBlockAppointments]);

  // Expose appointments to parent via callback
  React.useEffect(() => {
    if (onAppointmentsReady && appointments.length > 0) {
      onAppointmentsReady(appointments);
    }
  }, [appointments, onAppointmentsReady]);

  // Notify parent when calendar has loaded with the current date
  const calendarReadyCalled = React.useRef(false);
  React.useEffect(() => {
    if (!calendarReadyCalled.current && onCalendarReady) {
      calendarReadyCalled.current = true;
      onCalendarReady(currentDate);
    }
  }, [currentDate, onCalendarReady]);

  // Helper to get block appointments for a specific date
  const getBlockAppointmentsForDate = (date: Date): BlockAppointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log('[Calendar] getBlockAppointmentsForDate:', { dateStr, blockAppointments });
    if (!blockAppointments || !Array.isArray(blockAppointments)) {
      console.log('[Calendar] No block appointments or not an array');
      return [];
    }
    const filtered = blockAppointments.filter(apt => apt.date === dateStr);
    console.log('[Calendar] Filtered block appointments:', filtered);
    return filtered;
  };

  // Helper to get style for block appointment
  const getBlockAppointmentStyle = (block: BlockAppointment) => {
    const [sH, sM] = block.start_time.split(':').map(Number);
    const startSlotIndex = (sH - 6) * 4 + Math.floor(sM / 15);
    const [eH, eM] = block.end_time.split(':').map(Number);
    const endSlotIndex = (eH - 6) * 4 + Math.floor(eM / 15);
    const durationSlots = Math.max(endSlotIndex - startSlotIndex, 1);
    return {
      top:    `${startSlotIndex * 1.25}rem`,
      height: `${durationSlots * 1.25}rem`,
    };
  };

  // ── Drag-to-reschedule ────────────────────────────────────────────────────
  const handleRescheduleRequest = useCallback((
    appointment: Appointment,
    newDate:     Date,
    newHour:     number,
    newMinutes:  number,
  ) => {
    setRescheduleTarget({ type: 'appointment', appointment, newDate, newHour, newMinutes });
  }, []);

  const handleBlockRescheduleRequest = useCallback((
    block: BlockAppointment,
    newDate:     Date,
    newHour:     number,
    newMinutes:  number,
  ) => {
    // Calculate the new end time based on original duration
    const [startH, startM] = block.start_time.split(':').map(Number);
    const [endH, endM] = block.end_time.split(':').map(Number);
    const originalDuration = (endH * 60 + endM) - (startH * 60 + startM);
    const newEndTotalMins = newHour * 60 + newMinutes + originalDuration;
    const newEndH = Math.floor(newEndTotalMins / 60);
    const newEndM = newEndTotalMins % 60;
    
    const newStartTime = `${String(newHour).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    const newEndTime = `${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`;
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    
    // Check for conflicts with existing appointments
    const conflict = getFirstConflict({
      date: newDateStr,
      start_time: newStartTime,
      end_time: newEndTime,
    });
    
    if (conflict) {
      // Store pending block drop and show conflict modal
      setPendingBlockDrop({ block, newDate, newHour, newMinutes });
      setConflictingAppointment(conflict);
      setShowConflictModal(true);
    } else {
      // No conflict, proceed with reschedule
      setRescheduleTarget({ type: 'block', block, newDate, newHour, newMinutes });
    }
  }, [getFirstConflict]);

  const { dragState, startHold, cancelHold, onDragMove, onDropOnSlot } =
    useAppointmentDrag(handleRescheduleRequest);

  const {
    blockDragState,
    startBlockHold,
    cancelBlockHold,
    onBlockDragMove,
    onBlockDropOnSlot,
  } = useBlockAppointmentDrag(handleBlockRescheduleRequest);

  const confirmReschedule = async () => {
    if (!rescheduleTarget) return;
    const { type, appointment, block, newDate, newHour, newMinutes } = rescheduleTarget;

    setIsRescheduling(true);
    try {
      if (type === 'appointment' && appointment) {
        const durationMins = appointment.duration_minutes;
        const endTotalMins = newHour * 60 + newMinutes + durationMins;
        const endH         = Math.floor(endTotalMins / 60);
        const endM         = endTotalMins % 60;

        const updated = await rescheduleAppointment(appointment.id, {
          date:       format(newDate, 'yyyy-MM-dd'),
          start_time: `${String(newHour).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`,
          end_time:   `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
        });
        updateAppointmentInState(updated);
        toast.success(
          `Rescheduled to ${format(newDate, 'MMM d')} at ` +
          `${String(newHour).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
        );
      } else if (type === 'block' && block) {
        // Calculate end time based on original duration
        const [startH, startM] = block.start_time.split(':').map(Number);
        const [endH, endM] = block.end_time.split(':').map(Number);
        const originalDuration = (endH * 60 + endM) - (startH * 60 + startM);
        const newEndTotalMins = newHour * 60 + newMinutes + originalDuration;
        const newEndH = Math.floor(newEndTotalMins / 60);
        const newEndM = newEndTotalMins % 60;

        const updated = await updateBlockAppointment(block.id, {
          date:       format(newDate, 'yyyy-MM-dd'),
          start_time: `${String(newHour).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`,
          end_time:   `${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`,
        });
        updateBlockAppointmentInState(updated);
        toast.success(
          `Event rescheduled to ${format(newDate, 'MMM d')} at ` +
          `${String(newHour).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
        );
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail 
        : 'Failed to reschedule';
      toast.error(errorMessage ?? 'Failed to reschedule.');
    } finally {
      setIsRescheduling(false);
      setRescheduleTarget(null);
    }
  };

  // ── Drag selection ────────────────────────────────────────────────────────
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

  const generateTimeSlots = () => {
    const slots = [];

    for (let hour = 6; hour <= 11; hour++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        const h12     = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const period  = hour >= 12 ? 'PM' : 'AM';
        slots.push({
          hour,
          quarter,
          minutes,
          label:        quarter === 0 ? `${h12} ${period}` : '',
          time:         `${hour}:${minutes.toString().padStart(2, '0')}`,
          isLunchBreak: false,
        });
      }
    }

    for (let quarter = 0; quarter < 4; quarter++) {
      const minutes = quarter * 15;
      slots.push({
        hour:         12,
        quarter,
        minutes,
        label:        quarter === 0 ? '12 PM' : '',
        time:         `12:${minutes.toString().padStart(2, '0')}`,
        isLunchBreak: true,
      });
    }

    slots.push({
      hour:         13,
      quarter:      0,
      minutes:      0,
      label:        '1 PM',
      time:         '13:00',
      isLunchBreak: true,
    });

    for (let hour = 13; hour <= 20; hour++) {
      const startQuarter = hour === 13 ? 1 : 0;
      for (let quarter = startQuarter; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        const h12     = hour > 12 ? hour - 12 : hour;
        slots.push({
          hour,
          quarter,
          minutes,
          label:        quarter === 0 ? `${h12} PM` : '',
          time:         `${hour}:${minutes.toString().padStart(2, '0')}`,
          isLunchBreak: false,
        });
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Filter out cancelled appointments - they should not appear in the calendar
    return appointments.filter(apt => apt.date === dateStr && apt.status !== 'CANCELLED');
  };

  const getAppointmentsForDay = (date: Date): Appointment[] =>
    getAppointmentsForDate(date);

  const getAppointmentStyle = (apt: Appointment) => {
    const [sH, sM]       = apt.start_time.split(':').map(Number);
    const startSlotIndex = (sH - 6) * 4 + Math.floor(sM / 15);
    const durationSlots  = Math.max(apt.duration_minutes / 15, 1);
    return {
      top:    `${startSlotIndex * 1.25}rem`,
      height: `${durationSlots * 1.25}rem`,
    };
  };

  // ── Time column label ─────────────────────────────────────────────────────
  const renderTimeLabel = (slot: typeof timeSlots[0], i: number) => {
    const isLunch = slot.isLunchBreak;
    return (
      <div
        key={i}
        className={`h-5 px-3 text-xs font-medium text-right flex items-center justify-end
          ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
          ${isLunch ? 'bg-amber-50 text-amber-400' : 'bg-gray-50 text-gray-500'}`}
      >
        {slot.label}
      </div>
    );
  };

  const handleAppointmentClick = (apt: Appointment) => {
    if (dragState.isDragging || dragState.isHolding || blockDragState.isDragging || blockDragState.isHolding) return;
    hideHover();
    setSelectedAppointment(apt);
    setIsViewOpen(true);
  };

  const handleMouseDown = (_date: Date, slot: any) => {
    if (dragState.isDragging || blockDragState.isDragging) return;
    isDraggingRef.current    = false;
    dragStartTimeRef.current = Date.now();
    startSelection(slot);
  };

  const handleMouseEnter = (slot: any) => {
    if (dragState.isDragging || blockDragState.isDragging) return;
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
    if ((dragState.isDragging && dragState.draggedAppointment) || (blockDragState.isDragging && blockDragState.draggedBlock)) return;

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

  const handleSlotMouseUp = (date: Date, slot: { hour: number; minutes: number }) => {
    if (dragState.isDragging) {
      onDropOnSlot(date, slot.hour, slot.minutes);
      return;
    }
    if (blockDragState.isDragging) {
      onBlockDropOnSlot(date, slot.hour, slot.minutes);
      return;
    }
    handleMouseUp(date);
  };

  const handleDoubleClick = (date: Date, slot: any) => {
    if (dragState.isDragging || dragState.isHolding || blockDragState.isDragging || blockDragState.isHolding) return;
    openModal({ date, time: slot.time, hour: slot.hour, minutes: slot.minutes, duration: 15 });
  };

  const handleAppointmentCreated = (appointment: Appointment) => {
    addAppointmentToState(appointment);
  };

  const handleModalClose = () => closeModal();
  const handleViewClose  = () => { setIsViewOpen(false); setSelectedAppointment(null); };

  const getWeekDays = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getMonthDays = () => {
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

  // ── Shared overlays ───────────────────────────────────────────────────────
  const dragOverlays = (
    <>
      {dragState.isHolding && dragState.ghostPosition && (
        <HoldRing progress={dragState.holdProgress} position={dragState.ghostPosition} />
      )}
      {dragState.isDragging && dragState.ghostPosition && dragState.draggedAppointment && (
        <DragGhost appointment={dragState.draggedAppointment} position={dragState.ghostPosition} />
      )}
      {blockDragState.isHolding && blockDragState.ghostPosition && (
        <HoldRing progress={blockDragState.holdProgress} position={blockDragState.ghostPosition} />
      )}
      {blockDragState.isDragging && blockDragState.ghostPosition && blockDragState.draggedBlock && (
        <div
          className="fixed pointer-events-none z-[9999] opacity-90 shadow-2xl"
          style={{
            left:      blockDragState.ghostPosition.x - 80,
            top:       blockDragState.ghostPosition.y - 20,
            width:     160,
            transform: 'rotate(2deg)',
          }}
        >
          <div className="bg-gray-800 text-white rounded-lg px-3 py-2 text-xs font-semibold shadow-lg border-2 border-gray-600">
            <div className="truncate">{blockDragState.draggedBlock.event_name}</div>
            <div className="text-gray-300 mt-0.5 truncate">
              {blockDragState.draggedBlock.start_time} · {blockDragState.draggedBlock.end_time}
            </div>
            <div className="mt-1 flex items-center gap-1 text-gray-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Drop to reschedule
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── Hover card overlay ────────────────────────────────────────────────────
  const hoverCardOverlay = hoverState.visible && hoverState.appointment && hoverState.anchorRect && (
    <AppointmentHoverCard
      appointment={hoverState.appointment}
      anchorRect={hoverState.anchorRect}
      onEnter={onHoverCardEnter}
      onLeave={onHoverCardLeave}
    />
  );

  // ── Block hover card overlay ───────────────────────────────────────────────────
  const blockHoverCardOverlay = blockHoverState.visible && blockHoverState.block && blockHoverState.anchorRect && (
    <BlockHoverCard
      block={blockHoverState.block}
      anchorRect={blockHoverState.anchorRect}
      onEnter={onBlockPopoverEnter}
      onLeave={onBlockPopoverLeave}
    />
  );

  // ── Reschedule confirmation modal ─────────────────────────────────────────
  const rescheduleModal = rescheduleTarget && (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">Confirm Reschedule</h3>
        {rescheduleTarget.type === 'appointment' && rescheduleTarget.appointment ? (
          <>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">{rescheduleTarget.appointment.patient_name}</span>
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="font-medium text-gray-700">From:</span>
                {rescheduleTarget.appointment.date} at {rescheduleTarget.appointment.start_time}
              </div>
              <div className="flex items-center gap-2 text-sky-600">
                <span className="font-medium">To:</span>
                {format(rescheduleTarget.newDate, 'yyyy-MM-dd')} at{' '}
                {String(rescheduleTarget.newHour).padStart(2, '0')}:
                {String(rescheduleTarget.newMinutes).padStart(2, '0')}
              </div>
            </div>
          </>
        ) : rescheduleTarget.type === 'block' && rescheduleTarget.block ? (
          <>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">{rescheduleTarget.block.event_name}</span>
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="font-medium text-gray-700">From:</span>
                {rescheduleTarget.block.date} at {rescheduleTarget.block.start_time} - {rescheduleTarget.block.end_time}
              </div>
              <div className="flex items-center gap-2 text-sky-600">
                <span className="font-medium">To:</span>
                {format(rescheduleTarget.newDate, 'yyyy-MM-dd')} at{' '}
                {String(rescheduleTarget.newHour).padStart(2, '0')}:
                {String(rescheduleTarget.newMinutes).padStart(2, '0')}
              </div>
            </div>
          </>
        ) : null}
        <div className="flex gap-3">
          <button
            onClick={() => setRescheduleTarget(null)}
            disabled={isRescheduling}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={confirmReschedule}
            disabled={isRescheduling}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRescheduling ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Saving…
              </>
            ) : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Shared modals ─────────────────────────────────────────────────────────
  const sharedModals = (
    <>
      <AppointmentModal
        isOpen={isOpen}
        onClose={handleModalClose}
        onCreated={handleAppointmentCreated}
        selectedSlot={selectedSlot}
        selectedClinicBranchId={selectedClinicBranchId}
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
      {/* Conflict Modal for block drag/reschedule */}
      <ConflictModal
        isOpen={showConflictModal}
        conflictingAppointment={conflictingAppointment}
        onBlockExisting={() => {
          // Proceed with the block reschedule despite conflict
          setShowConflictModal(false);
          setConflictingAppointment(null);
          // If there was a pending block drop, proceed with reschedule
          if (pendingBlockDrop) {
            setRescheduleTarget({
              type: 'block',
              block: pendingBlockDrop.block,
              newDate: pendingBlockDrop.newDate,
              newHour: pendingBlockDrop.newHour,
              newMinutes: pendingBlockDrop.newMinutes,
            });
            setPendingBlockDrop(null);
          }
        }}
        onRescheduleExisting={() => {
          // Cancel block creation, prompt user to reschedule existing appointment
          setShowConflictModal(false);
          setConflictingAppointment(null);
          setPendingBlockDrop(null);
          // Show toast for rescheduling
          if (conflictingAppointment) {
            toast('Please drag the existing appointment to a new time before creating the block appointment.', {
              icon: '📅',
              duration: 5000,
            });
          }
        }}
        onCancel={() => {
          // Cancel block creation
          setShowConflictModal(false);
          setConflictingAppointment(null);
          setPendingBlockDrop(null);
        }}
      />
    </>
  );

  // ── Appointment Card — Day/Week ───────────────────────────────────────────
  const renderTimelineCard = (apt: Appointment, compact = false) => {
    const style     = getAppointmentStyle(apt);
    const col       = getBlockColors(apt);
    const isDragged = dragState.draggedAppointment?.id === apt.id;
    const isHeld    = dragState.isHolding && dragState.draggedAppointment?.id === apt.id;
    const canDrag   = apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED';

    const containerStyle: React.CSSProperties = {
      ...style,
      position:     'absolute',
      left:         '4px',
      right:        '4px',
      zIndex:       isDragged ? 5 : 10,
      overflow:     'hidden',
      borderRadius: '8px',
      border:       '1px solid',
      padding:      compact ? '2px 6px' : '6px 8px',
      cursor:       canDrag ? (dragState.isDragging ? 'grabbing' : 'grab') : 'pointer',
      transition:   'filter 0.15s, opacity 0.15s, transform 0.15s',
      opacity:      isDragged ? 0.35 : 1,
      transform:    isHeld ? 'scale(1.03)' : 'scale(1)',
      ...(col.useHex ? col.bgStyle : {}),
    };

    return (
      <div
        key={apt.id}
        style={containerStyle}
        onMouseEnter={(e) => { if (!dragState.isDragging) onCardMouseEnter(apt, e); }}
        onMouseLeave={() => { if (!dragState.isDragging) onCardMouseLeave(); }}
        onMouseDown={canDrag ? (e) => { hideHover(); startHold(apt, e); } : undefined}
        onMouseUp={canDrag ? () => { if (!dragState.isDragging) { cancelHold(); handleAppointmentClick(apt); } } : undefined}
        onClick={(e) => { e.stopPropagation(); if (!dragState.isDragging && !dragState.isHolding) handleAppointmentClick(apt); }}
        className={`hover:brightness-95 select-none ${!col.useHex ? `${col.bg} ${col.border}` : ''}`}
        title={canDrag ? 'Hold 2s to drag and reschedule' : undefined}
      >
        {isHeld && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none border-2 border-sky-400 animate-pulse"
            style={{ zIndex: 20 }}
          />
        )}
        {col.useHex && (
          <div
            className="absolute top-0 left-0 bottom-0 w-1 rounded-l-lg"
            style={{ backgroundColor: col.hex }}
          />
        )}
        <div className="pl-2">
          <div
            className="text-xs font-semibold truncate"
            style={col.useHex ? { color: col.hex } : {}}
          >
            <span className={!col.useHex ? col.text : ''}>{apt.patient_name}</span>
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
              <span className={!col.useHex ? 'text-gray-600' : ''}>{apt.start_time}</span>
            </div>
          )}
          {col.label && !compact && (
            <div
              className="text-xs truncate mt-1 font-medium"
              style={col.useHex ? { color: hexToRgba(col.hex, 0.85) } : {}}
            >
              <span className={!col.useHex ? 'text-gray-500' : ''}>{col.label}</span>
            </div>
          )}
          {col.label && compact && (
            <div
              className="text-xs truncate"
              style={col.useHex ? { color: hexToRgba(col.hex, 0.85) } : {}}
            >
              <span className={!col.useHex ? 'text-gray-500' : ''}>{col.label}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to check if there's a conflict between appointment and any block
  const hasBlockConflict = useCallback((apt: Appointment, blocks: BlockAppointment[]): boolean => {
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const aptStart = timeToMinutes(apt.start_time);
    const aptEnd = timeToMinutes(apt.end_time);

    for (const block of blocks) {
      if (block.date !== apt.date) continue;
      const blockStart = timeToMinutes(block.start_time);
      const blockEnd = timeToMinutes(block.end_time);
      // Check for overlap
      if (aptStart < blockEnd && aptEnd > blockStart) {
        return true;
      }
    }
    return false;
  }, []);

  // Helper to format time in 12-hour format
  const formatTime12Hour = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // ── Block Appointment Card — Day/Week ────────────────────────────────────────
  const renderBlockTimelineCard = (block: BlockAppointment, compact = false) => {
    const style = getBlockAppointmentStyle(block);

    const isDragged = blockDragState.draggedBlock?.id === block.id;
    const isHeld    = blockDragState.isHolding && blockDragState.draggedBlock?.id === block.id;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!blockDragState.isDragging) {
        onEventClick?.(block);
      }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      hideBlockHover();
      startBlockHold(block, e);
    };

    const handleMouseUp = () => {
      if (!blockDragState.isDragging) {
        cancelBlockHold();
      }
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
      if (!blockDragState.isDragging) {
        onBlockMouseEnter(block, e);
      }
    };

    const handleMouseLeave = () => {
      if (!blockDragState.isDragging) {
        onBlockMouseLeave();
      }
    };

    const containerStyle: React.CSSProperties = {
      ...style,
      position:     'absolute',
      left:         '4px',
      right:        '4px',
      zIndex:      isDragged ? 5 : 10,
      overflow:    'hidden',
      borderRadius: '6px',
      backgroundColor: isDragged ? 'rgba(31, 41, 55, 0.4)' : 'rgba(31, 41, 55, 0.8)',
      cursor:       blockDragState.isDragging ? 'grabbing' : 'grab',
      opacity:      isDragged ? 0.35 : 1,
      transform:    isHeld ? 'scale(1.03)' : 'scale(1)',
      transition:   'filter 0.15s, opacity 0.15s, transform 0.15s',
    };

    return (
      <div
        key={`block-${block.id}`}
        style={containerStyle}
        className="border border-gray-600 px-2 py-1 transition-all select-none hover:brightness-110"
        title="Hold 2s to drag and reschedule"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isHeld && (
          <div
            className="absolute inset-0 rounded border-2 border-sky-400 animate-pulse pointer-events-none"
            style={{ zIndex: 20 }}
          />
        )}
        <div className="text-xs font-semibold text-white truncate">
          {block.event_name}
        </div>
        {!compact && (
          <div className="text-xs text-gray-300 truncate mt-0.5">
            {formatTime12Hour(block.start_time)} - {formatTime12Hour(block.end_time)}
          </div>
        )}
        {!compact && block.created_by_name && (
          <div className="text-xs text-gray-400 truncate">
            Created by {block.created_by_name}
          </div>
        )}
      </div>
    );
  };

  // ── Appointment Card — Month ──────────────────────────────────────────────
  const renderMonthCard = (apt: Appointment) => {
    const col       = getBlockColors(apt);
    const isDragged = dragState.draggedAppointment?.id === apt.id;
    const isHeld    = dragState.isHolding && dragState.draggedAppointment?.id === apt.id;
    const canDrag   = apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED';

    const containerStyle: React.CSSProperties = col.useHex ? {
      backgroundColor: hexToRgba(col.hex, 0.12),
      borderColor:     col.hex,
      borderLeftColor: col.hex,
      borderLeftWidth: '3px',
      opacity:         isDragged ? 0.35 : 1,
      transform:       isHeld ? 'scale(1.02)' : 'scale(1)',
      cursor:          canDrag ? (dragState.isDragging ? 'grabbing' : 'grab') : 'pointer',
    } : {
      opacity:   isDragged ? 0.35 : 1,
      cursor:    canDrag ? (dragState.isDragging ? 'grabbing' : 'grab') : 'pointer',
      transform: isHeld ? 'scale(1.02)' : 'scale(1)',
    };

    return (
      <div
        key={apt.id}
        onMouseEnter={(e) => { if (!dragState.isDragging) onCardMouseEnter(apt, e); }}
        onMouseLeave={() => { if (!dragState.isDragging) onCardMouseLeave(); }}
        onMouseDown={canDrag ? (e) => { e.stopPropagation(); hideHover(); startHold(apt, e); } : undefined}
        onClick={(e) => { e.stopPropagation(); if (!dragState.isDragging && !dragState.isHolding) handleAppointmentClick(apt); }}
        style={containerStyle}
        className={`border rounded px-2 py-1 transition-all select-none hover:brightness-95 ${!col.useHex ? `${col.bg} ${col.border}` : ''}`}
        title={canDrag ? 'Hold 2s to drag and reschedule' : undefined}
      >
        {isHeld && (
          <div className="absolute inset-0 rounded pointer-events-none border-2 border-sky-400 animate-pulse" />
        )}
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
            <span className={!col.useHex ? 'text-gray-500' : ''}>{apt.service_name}</span>
          </div>
        )}
      </div>
    );
  };

  // ── Shared time-slot renderer (drop target) ───────────────────────────────
  const renderTimeSlot = (slot: typeof timeSlots[0], date: Date, i: number) => {
    const isSelected   = isSlotSelected(slot);
    const isDropTarget = dragState.isDragging;
    const isLunch      = slot.isLunchBreak;

    if (isLunch) {
      const isFirstLunchSlot = slot.hour === 12 && slot.quarter === 0;
      return (
        <div
          key={i}
          className={`h-5 relative select-none bg-amber-50 cursor-not-allowed
            ${slot.quarter === 0 ? 'border-t-2 border-amber-300' : 'border-t border-amber-200'}`}
          style={{ pointerEvents: 'none' }}
        >
          {isFirstLunchSlot && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 rounded-full px-3 py-0.5 shadow-sm">
                <span style={{ fontSize: 11 }}>🍽</span>
                <span className="font-semibold text-amber-700 whitespace-nowrap" style={{ fontSize: 10 }}>
                  LUNCH BREAK &nbsp;·&nbsp; 12:00 PM – 1:00 PM
                </span>
              </div>
            </div>
          )}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #f59e0b 0px, #f59e0b 2px,
                transparent 2px, transparent 8px
              )`,
            }}
          />
        </div>
      );
    }

    return (
      <div
        key={i}
        data-slot-date={format(date, 'yyyy-MM-dd')}
        data-slot-hour={slot.hour}
        data-slot-minute={slot.minutes}
        onMouseDown={() => handleMouseDown(date, slot)}
        onMouseEnter={() => handleMouseEnter(slot)}
        onMouseUp={() => handleSlotMouseUp(date, slot)}
        onDoubleClick={() => handleDoubleClick(date, slot)}
        className={`h-5 transition-colors cursor-pointer relative select-none
          ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
          ${isSelected
            ? 'bg-sky-200 hover:bg-sky-300'
            : isDropTarget
              ? 'hover:bg-emerald-100'
              : 'hover:bg-sky-50'
          }`}
        title={isDropTarget ? `Drop here: ${slot.time}` : 'Double-click or drag to add'}
      >
        {isSelected && (
          <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
        )}
        {isDropTarget && (
          <div className="absolute inset-0 border-b border-dashed border-emerald-300 pointer-events-none opacity-50" />
        )}
      </div>
    );
  };

  // ── Global mouse-move / mouse-up on the calendar wrapper ─────────────────
  const calendarWrapperProps = {
    onMouseMove:  (e: React.MouseEvent) => {
      onDragMove(e);
      onBlockDragMove(e);
    },
    onMouseUp:    (_e: React.MouseEvent) => {
      if (dragState.isHolding && !dragState.isDragging) cancelHold();
      if (blockDragState.isHolding && !blockDragState.isDragging) cancelBlockHold();
    },
    onMouseLeave: () => {
      if (dragState.isHolding && !dragState.isDragging) cancelHold();
      if (blockDragState.isHolding && !blockDragState.isDragging) cancelBlockHold();
    },
  };

  // ── DAY VIEW ──────────────────────────────────────────────────────────────
  if (view === 'day') {
    return (
      <div {...calendarWrapperProps} className="h-full flex flex-col">
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              {dragState.isDragging && (
                <p className="text-xs text-emerald-600 font-medium mt-1 animate-pulse">
                  🗓 Hover a time slot and release to reschedule
                </p>
              )}
              {blockDragState.isDragging && (
                <p className="text-xs text-emerald-600 font-medium mt-1 animate-pulse">
                  🗓 Hover a time slot and release to reschedule event
                </p>
              )}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {(() => {
              const dayAppts = getAppointmentsForDate(currentDate);
              const dayBlocks = getBlockAppointmentsForDate(currentDate);
              const hasConflict = dayAppts.some(apt => hasBlockConflict(apt, dayBlocks));
              
              if (hasConflict) {
                // 2-column layout when there's a conflict
                return (
                  <div className="grid grid-cols-[80px_1fr_1fr]">
                    {/* Time column */}
                    <div className="border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
                      {timeSlots.map((slot, i) => renderTimeLabel(slot, i))}
                    </div>
                    {/* Appointments column */}
                    <div className="border-r border-gray-200 relative" onMouseUp={() => handleMouseUp(currentDate)}>
                      {timeSlots.map((slot, i) => renderTimeSlot(slot, currentDate, i))}
                      {dayAppts.map(apt => renderTimelineCard(apt, false))}
                    </div>
                    {/* Block appointments column */}
                    <div className="relative" onMouseUp={() => handleMouseUp(currentDate)}>
                      {timeSlots.map((slot, i) => renderTimeSlot(slot, currentDate, i))}
                      {dayBlocks.map(block => renderBlockTimelineCard(block, false))}
                    </div>
                  </div>
                );
              }
              
              // Default layout (no conflict)
              return (
                <div className="grid grid-cols-[80px_1fr]">
                  {/* Time column */}
                  <div className="border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
                    {timeSlots.map((slot, i) => renderTimeLabel(slot, i))}
                  </div>
                  {/* Day column */}
                  <div className="relative" onMouseUp={() => handleMouseUp(currentDate)}>
                    {timeSlots.map((slot, i) => renderTimeSlot(slot, currentDate, i))}
                    {dayAppts.map(apt => renderTimelineCard(apt, false))}
                    {dayBlocks.map(block => renderBlockTimelineCard(block, false))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        {sharedModals}
        {dragOverlays}
        {rescheduleModal}
        {hoverCardOverlay}
        {blockHoverCardOverlay}
      </div>
    );
  }

  // ── WEEK VIEW ─────────────────────────────────────────────────────────────
  if (view === 'week') {
    const weekDays = getWeekDays(currentDate);

    return (
      <div {...calendarWrapperProps} className="h-full flex flex-col">
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Sticky day-header row */}
          <div className="flex-shrink-0 grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
            <div className="p-4" />
            {weekDays.map(day => (
              <div key={day.toISOString()} className="p-4 text-center border-l border-gray-200">
                <div className="text-xs font-medium text-gray-500 uppercase">{format(day, 'EEE')}</div>
                <div className={`text-sm font-semibold mt-1 ${isSameDay(day, new Date()) ? 'bg-sky-600 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {dragState.isDragging && (
            <div className="flex-shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-700 font-medium text-center animate-pulse">
              🗓 Hover a time slot and release to reschedule
            </div>
          )}

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {(() => {
              // Calculate grid columns based on each day's conflict status
              const getGridColumns = () => {
                const dayHasConflict = weekDays.map(day => {
                  const dayAppts = getAppointmentsForDate(day);
                  const dayBlocks = getBlockAppointmentsForDate(day);
                  return dayAppts.some(apt => hasBlockConflict(apt, dayBlocks));
                });
                // Build grid template: time column + each day (1 or 2 columns)
                const cols = ['80px', ...dayHasConflict.map(has => has ? '1fr 1fr' : '1fr')];
                return cols.join(' ');
              };

              return (
                <div className="grid" style={{ gridTemplateColumns: getGridColumns() }}>
                  {/* Time column */}
                  <div className="border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
                    {timeSlots.map((slot, i) => renderTimeLabel(slot, i))}
                  </div>
                  {/* Day columns - each day handled independently */}
                  {weekDays.map(day => {
                    const dayAppts = getAppointmentsForDate(day);
                    const dayBlocks = getBlockAppointmentsForDate(day);
                    const dayHasConflict = dayAppts.some(apt => hasBlockConflict(apt, dayBlocks));

                    if (dayHasConflict) {
                      // 2-column layout for this day
                      return (
                        <React.Fragment key={day.toISOString()}>
                          {/* Appointments column */}
                          <div className="border-l border-gray-200 relative">
                            {timeSlots.map((slot, i) => renderTimeSlot(slot, day, i))}
                            {dayAppts.map(apt => renderTimelineCard(apt, true))}
                          </div>
                          {/* Block appointments column */}
                          <div className="border-l border-gray-200 relative bg-gray-25">
                            {timeSlots.map((slot, i) => renderTimeSlot(slot, day, i))}
                            {dayBlocks.map(block => renderBlockTimelineCard(block, true))}
                          </div>
                        </React.Fragment>
                      );
                    }

                    // Single column for this day
                    return (
                      <div key={day.toISOString()} className="border-l border-gray-200 relative">
                        {timeSlots.map((slot, i) => renderTimeSlot(slot, day, i))}
                        {dayAppts.map(apt => renderTimelineCard(apt, true))}
                        {dayBlocks.map(block => renderBlockTimelineCard(block, true))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
        {sharedModals}
        {dragOverlays}
        {rescheduleModal}
        {hoverCardOverlay}
        {blockHoverCardOverlay}
      </div>
    );
  }

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  if (view === 'month') {
    const monthDays    = getMonthDays();
    const weekDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div {...calendarWrapperProps}>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
          {dragState.isDragging && (
            <div className="flex-shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-700 font-medium text-center animate-pulse">
              🗓 Release on a date cell to reschedule (time will be set to original time)
            </div>
          )}
          {blockDragState.isDragging && (
            <div className="flex-shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-700 font-medium text-center animate-pulse">
              🗓 Release on a date cell to reschedule event (time will be set to original time)
            </div>
          )}

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
                  const dayAppts     = getAppointmentsForDay(day);
                  const dayBlockAppts = getBlockAppointmentsForDate(day);
                  const count        = dayAppts.length + dayBlockAppts.length;
                  const isDropTarget = dragState.isDragging || blockDragState.isDragging;

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        if (dragState.isDragging && dragState.draggedAppointment) {
                          const [origH, origM] = dragState.draggedAppointment.start_time.split(':').map(Number);
                          onDropOnSlot(day, origH, origM);
                          return;
                        }
                        if (blockDragState.isDragging && blockDragState.draggedBlock) {
                          const [origH, origM] = blockDragState.draggedBlock.start_time.split(':').map(Number);
                          onBlockDropOnSlot(day, origH, origM);
                          return;
                        }
                        onDateChange(day);
                      }}
                      className={`min-h-[120px] p-2 border-r border-gray-200 last:border-r-0 transition-colors cursor-pointer relative
                        ${!isSameMonth(day, currentDate) ? 'bg-gray-50' : ''}
                        ${isSameDay(day, new Date()) ? 'bg-sky-50' : ''}
                        ${isDropTarget ? 'hover:bg-emerald-50 hover:border-emerald-300' : 'hover:bg-sky-50'}
                      `}
                    >
                      {isDropTarget && (
                        <div className="absolute inset-0 border-2 border-dashed border-emerald-300 rounded pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-sm font-medium
                          ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}
                          ${isSameDay(day, new Date()) ? 'bg-sky-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold' : ''}`}
                        >
                          {format(day, 'd')}
                        </div>
                        {count > 0 && (
                          <div className="bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                            {count}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 mt-2 relative">
                        {/* Regular appointments */}
                        {dayAppts.slice(0, 3).map(apt => renderMonthCard(apt))}
                        {/* Block appointments */}
                        {dayBlockAppts.slice(0, 2).map(block => {
                          const handleBlockClick = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (!blockDragState.isDragging) {
                              onEventClick?.(block);
                            }
                          };
                          const handleBlockMouseEnter = (e: React.MouseEvent) => {
                            if (!blockDragState.isDragging) {
                              onBlockMouseEnter(block, e);
                            }
                          };
                          const handleBlockMouseLeave = () => {
                            if (!blockDragState.isDragging) {
                              onBlockMouseLeave();
                            }
                          };
                          const handleBlockMouseDown = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            hideBlockHover();
                            startBlockHold(block, e);
                          };
                          return (
                            <div
                              key={block.id}
                              onClick={handleBlockClick}
                              onMouseEnter={handleBlockMouseEnter}
                              onMouseLeave={handleBlockMouseLeave}
                              onMouseDown={handleBlockMouseDown}
                              className="bg-gray-800/80 text-white text-xs px-2 py-1 rounded truncate font-medium border border-gray-600 hover:brightness-110 cursor-pointer transition-all"
                              title="Hold 2s to drag and reschedule"
                            >
                              <div className="font-semibold">{block.event_name}</div>
                              <div className="text-gray-300">
                                {formatTime12Hour(block.start_time)} - {formatTime12Hour(block.end_time)}
                              </div>
                              {block.created_by_name && (
                                <div className="text-gray-400">
                                  Created by {block.created_by_name}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {count > 3 && (
                          <div className="text-xs text-gray-500 font-medium px-2">+{count - 3} more</div>
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
        {dragOverlays}
        {rescheduleModal}
        {hoverCardOverlay}
        {blockHoverCardOverlay}
      </div>
    );
  }

  return null;
};