import { useState, useRef, useCallback } from 'react';
import type { Appointment } from '@/types';

export interface DragState {
  isDragging:       boolean;
  draggedAppointment: Appointment | null;
  ghostPosition:    { x: number; y: number } | null;
  holdProgress:     number;       // 0–100 for the hold indicator ring
  isHolding:        boolean;      // true while the 2s hold timer is running
}

interface UseAppointmentDragReturn {
  dragState:            DragState;
  startHold:            (apt: Appointment, e: React.MouseEvent | React.TouchEvent) => void;
  cancelHold:           () => void;
  onDragMove:           (e: React.MouseEvent | React.TouchEvent) => void;
  onDropOnSlot:         (date: Date, hour: number, minutes: number) => void;
  cancelDrag:           () => void;
}

const HOLD_DURATION_MS = 2000;

export const useAppointmentDrag = (
  onReschedule: (appointment: Appointment, newDate: Date, newHour: number, newMinutes: number) => void
): UseAppointmentDragReturn => {

  const [dragState, setDragState] = useState<DragState>({
    isDragging:          false,
    draggedAppointment:  null,
    ghostPosition:       null,
    holdProgress:        0,
    isHolding:           false,
  });

  const holdTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef      = useRef<number>(0);
  const appointmentRef    = useRef<Appointment | null>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const startHold = useCallback((apt: Appointment, e: React.MouseEvent | React.TouchEvent) => {
    // Only allow dragging non-cancelled/completed appointments
    if (apt.status === 'CANCELLED' || apt.status === 'COMPLETED') return;

    e.preventDefault();
    e.stopPropagation();

    appointmentRef.current = apt;
    holdStartRef.current   = Date.now();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState({
      isDragging:          false,
      draggedAppointment:  apt,
      ghostPosition:       { x: clientX, y: clientY },
      holdProgress:        0,
      isHolding:           true,
    });

    // Progress ring tick — every 50ms
    holdTimerRef.current = setInterval(() => {
      const elapsed  = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);

      if (elapsed >= HOLD_DURATION_MS) {
        clearHoldTimer();
        setDragState(prev => ({
          ...prev,
          isDragging:   true,
          isHolding:    false,
          holdProgress: 100,
        }));
      } else {
        setDragState(prev => ({ ...prev, holdProgress: progress }));
      }
    }, 50);
  }, [clearHoldTimer]);

  const cancelHold = useCallback(() => {
    clearHoldTimer();
    appointmentRef.current = null;
    setDragState({
      isDragging:          false,
      draggedAppointment:  null,
      ghostPosition:       null,
      holdProgress:        0,
      isHolding:           false,
    });
  }, [clearHoldTimer]);

  const onDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging && !dragState.isHolding) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // If still holding (not yet dragging), cancel if moved too far
    if (dragState.isHolding && !dragState.isDragging) {
      const ghost = dragState.ghostPosition;
      if (ghost) {
        const dist = Math.sqrt((clientX - ghost.x) ** 2 + (clientY - ghost.y) ** 2);
        if (dist > 10) {
          cancelHold();
          return;
        }
      }
    }

    if (dragState.isDragging) {
      setDragState(prev => ({
        ...prev,
        ghostPosition: { x: clientX, y: clientY },
      }));
    }
  }, [dragState.isDragging, dragState.isHolding, dragState.ghostPosition, cancelHold]);

  const onDropOnSlot = useCallback((date: Date, hour: number, minutes: number) => {
    if (!dragState.isDragging || !dragState.draggedAppointment) return;
    onReschedule(dragState.draggedAppointment, date, hour, minutes);
    setDragState({
      isDragging:          false,
      draggedAppointment:  null,
      ghostPosition:       null,
      holdProgress:        0,
      isHolding:           false,
    });
  }, [dragState.isDragging, dragState.draggedAppointment, onReschedule]);

  const cancelDrag = useCallback(() => {
    clearHoldTimer();
    setDragState({
      isDragging:          false,
      draggedAppointment:  null,
      ghostPosition:       null,
      holdProgress:        0,
      isHolding:           false,
    });
  }, [clearHoldTimer]);

  return { dragState, startHold, cancelHold, onDragMove, onDropOnSlot, cancelDrag };
};