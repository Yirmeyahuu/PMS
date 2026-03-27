import { useState, useRef, useCallback } from 'react';
import type { BlockAppointment } from '@/types';

interface BlockHoverState {
  block: BlockAppointment | null;
  anchorRect: DOMRect | null;
  visible: boolean;
}

export const useBlockHover = () => {
  const [blockHoverState, setBlockHoverState] = useState<BlockHoverState>({
    block: null,
    anchorRect: null,
    visible: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const onBlockMouseEnter = useCallback((block: BlockAppointment, e: React.MouseEvent) => {
    clearTimers();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      setBlockHoverState({ block, anchorRect: rect, visible: true });
    }, 500); // 500ms delay for faster hover response
  }, []);

  const onBlockMouseLeave = useCallback(() => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => {
      setBlockHoverState(prev => ({ ...prev, visible: false }));
    }, 120);
  }, []);

  const onBlockPopoverEnter = useCallback(() => {
    clearTimers();
  }, []);

  const onBlockPopoverLeave = useCallback(() => {
    clearTimers();
    setBlockHoverState(prev => ({ ...prev, visible: false }));
  }, []);

  const hideBlockHover = useCallback(() => {
    clearTimers();
    setBlockHoverState({ block: null, anchorRect: null, visible: false });
  }, []);

  return {
    blockHoverState,
    onBlockMouseEnter,
    onBlockMouseLeave,
    onBlockPopoverEnter,
    onBlockPopoverLeave,
    hideBlockHover,
  };
};
