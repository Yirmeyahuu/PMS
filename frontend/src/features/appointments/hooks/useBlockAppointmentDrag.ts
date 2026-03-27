import { useState, useRef, useCallback } from 'react';
import type { BlockAppointment } from '@/types';

export interface BlockDragState {
  isDragging:       boolean;
  draggedBlock:     BlockAppointment | null;
  ghostPosition:    { x: number; y: number } | null;
  holdProgress:     number;       // 0–100 for the hold indicator ring
  isHolding:        boolean;      // true while the 2s hold timer is running
}

interface UseBlockAppointmentDragReturn {
  blockDragState:      BlockDragState;
  startBlockHold:      (block: BlockAppointment, e: React.MouseEvent | React.TouchEvent) => void;
  cancelBlockHold:     () => void;
  onBlockDragMove:     (e: React.MouseEvent | React.TouchEvent) => void;
  onBlockDropOnSlot:   (date: Date, hour: number, minutes: number) => void;
  cancelBlockDrag:     () => void;
}

const HOLD_DURATION_MS = 2000;

export const useBlockAppointmentDrag = (
  onReschedule: (block: BlockAppointment, newDate: Date, newHour: number, newMinutes: number) => void
): UseBlockAppointmentDragReturn => {

  const [blockDragState, setBlockDragState] = useState<BlockDragState>({
    isDragging:    false,
    draggedBlock:  null,
    ghostPosition: null,
    holdProgress:  0,
    isHolding:     false,
  });

  const holdTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef  = useRef<number>(0);
  const blockRef      = useRef<BlockAppointment | null>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const startBlockHold = useCallback((block: BlockAppointment, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    blockRef.current    = block;
    holdStartRef.current = Date.now();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setBlockDragState({
      isDragging:    false,
      draggedBlock:  block,
      ghostPosition: { x: clientX, y: clientY },
      holdProgress:  0,
      isHolding:     true,
    });

    // Progress ring tick — every 50ms
    holdTimerRef.current = setInterval(() => {
      const elapsed  = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);

      if (elapsed >= HOLD_DURATION_MS) {
        clearHoldTimer();
        setBlockDragState(prev => ({
          ...prev,
          isDragging:   true,
          isHolding:    false,
          holdProgress: 100,
        }));
      } else {
        setBlockDragState(prev => ({ ...prev, holdProgress: progress }));
      }
    }, 50);
  }, [clearHoldTimer]);

  const cancelBlockHold = useCallback(() => {
    clearHoldTimer();
    blockRef.current = null;
    setBlockDragState({
      isDragging:    false,
      draggedBlock:  null,
      ghostPosition: null,
      holdProgress:  0,
      isHolding:     false,
    });
  }, [clearHoldTimer]);

  const onBlockDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!blockDragState.isDragging && !blockDragState.isHolding) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // If still holding (not yet dragging), cancel if moved too far
    if (blockDragState.isHolding && !blockDragState.isDragging) {
      const ghost = blockDragState.ghostPosition;
      if (ghost) {
        const dist = Math.sqrt((clientX - ghost.x) ** 2 + (clientY - ghost.y) ** 2);
        if (dist > 10) {
          cancelBlockHold();
          return;
        }
      }
    }

    if (blockDragState.isDragging) {
      setBlockDragState(prev => ({
        ...prev,
        ghostPosition: { x: clientX, y: clientY },
      }));
    }
  }, [blockDragState.isDragging, blockDragState.isHolding, blockDragState.ghostPosition, cancelBlockHold]);

  const onBlockDropOnSlot = useCallback((date: Date, hour: number, minutes: number) => {
    if (!blockDragState.isDragging || !blockDragState.draggedBlock) return;
    onReschedule(blockDragState.draggedBlock, date, hour, minutes);
    setBlockDragState({
      isDragging:    false,
      draggedBlock:  null,
      ghostPosition: null,
      holdProgress:  0,
      isHolding:     false,
    });
  }, [blockDragState.isDragging, blockDragState.draggedBlock, onReschedule]);

  const cancelBlockDrag = useCallback(() => {
    clearHoldTimer();
    setBlockDragState({
      isDragging:    false,
      draggedBlock:  null,
      ghostPosition: null,
      holdProgress:  0,
      isHolding:     false,
    });
  }, [clearHoldTimer]);

  return { 
    blockDragState, 
    startBlockHold, 
    cancelBlockHold, 
    onBlockDragMove, 
    onBlockDropOnSlot, 
    cancelBlockDrag 
  };
};