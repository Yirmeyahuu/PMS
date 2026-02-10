import { useState, useRef } from 'react';

interface TimeSlot {
  hour: number;
  quarter: number;
  minutes: number;
  time: string;
  label: string;
}

interface DragSelection {
  startSlot: TimeSlot | null;
  endSlot: TimeSlot | null;
  isSelecting: boolean;
}

export const useDragSelection = () => {
  const [selection, setSelection] = useState<DragSelection>({
    startSlot: null,
    endSlot: null,
    isSelecting: false,
  });

  const startSelection = (slot: TimeSlot) => {
    setSelection({
      startSlot: slot,
      endSlot: slot,
      isSelecting: true,
    });
  };

  const updateSelection = (slot: TimeSlot) => {
    if (selection.isSelecting) {
      setSelection(prev => ({
        ...prev,
        endSlot: slot,
      }));
    }
  };

  const endSelection = () => {
    setSelection(prev => ({
      ...prev,
      isSelecting: false,
    }));
  };

  const clearSelection = () => {
    setSelection({
      startSlot: null,
      endSlot: null,
      isSelecting: false,
    });
  };

  // Calculate if a slot is within the selection range
  const isSlotSelected = (slot: TimeSlot): boolean => {
    if (!selection.startSlot || !selection.endSlot) return false;

    const startIndex = selection.startSlot.hour * 4 + selection.startSlot.quarter;
    const endIndex = selection.endSlot.hour * 4 + selection.endSlot.quarter;
    const currentIndex = slot.hour * 4 + slot.quarter;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    return currentIndex >= minIndex && currentIndex <= maxIndex;
  };

  // Calculate total duration in minutes
  const getSelectionDuration = (): number => {
    if (!selection.startSlot || !selection.endSlot) return 15;

    const startIndex = selection.startSlot.hour * 4 + selection.startSlot.quarter;
    const endIndex = selection.endSlot.hour * 4 + selection.endSlot.quarter;

    const slots = Math.abs(endIndex - startIndex) + 1;
    return slots * 15; // 15 minutes per slot
  };

  // Get the start time of the selection
  const getSelectionStartTime = (): { hour: number; minutes: number } | null => {
    if (!selection.startSlot || !selection.endSlot) return null;

    const startIndex = selection.startSlot.hour * 4 + selection.startSlot.quarter;
    const endIndex = selection.endSlot.hour * 4 + selection.endSlot.quarter;

    const earlierSlot = startIndex <= endIndex ? selection.startSlot : selection.endSlot;

    return {
      hour: earlierSlot.hour,
      minutes: earlierSlot.minutes,
    };
  };

  return {
    selection,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    isSlotSelected,
    getSelectionDuration,
    getSelectionStartTime,
  };
};