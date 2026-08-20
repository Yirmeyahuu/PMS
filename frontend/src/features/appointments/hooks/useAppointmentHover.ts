import { useState, useRef, useCallback } from 'react';
import type { Appointment } from '@/types';

interface HoverState {
  appointment: Appointment | null;
  anchorElement: HTMLElement | null;
  visible:     boolean;
}

export const useAppointmentHover = () => {
  const [hoverState, setHoverState] = useState<HoverState>({
    appointment: null,
    anchorElement: null,
    visible:     false,
  });

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current)     clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const onMouseEnter = useCallback((apt: Appointment, e: React.MouseEvent) => {
    clearTimers();
    const el = e.currentTarget as HTMLElement;
    timerRef.current = setTimeout(() => {
      setHoverState({ appointment: apt, anchorElement: el, visible: true });
    }, 1000);
  }, []);

  const onMouseLeave = useCallback(() => {
    clearTimers();
    // Small delay so the user can move the mouse onto the popover itself
    hideTimerRef.current = setTimeout(() => {
      setHoverState(prev => ({ ...prev, visible: false }));
    }, 120);
  }, []);

  const onPopoverEnter = useCallback(() => {
    clearTimers();
  }, []);

  const onPopoverLeave = useCallback(() => {
    clearTimers();
    setHoverState(prev => ({ ...prev, visible: false }));
  }, []);

  const hideHover = useCallback(() => {
    clearTimers();
    setHoverState({ appointment: null, anchorElement: null, visible: false });
  }, []);

  return {
    hoverState,
    onMouseEnter,
    onMouseLeave,
    onPopoverEnter,
    onPopoverLeave,
    hideHover,
  };
};