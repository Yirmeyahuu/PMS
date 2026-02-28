import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';

interface UseAutoSaveParams {
  data: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  interval?: number;
  enabled?: boolean;
}

export const useAutoSave = ({
  data,
  onSave,
  interval = 30000,
  enabled = true,
}: UseAutoSaveParams) => {
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const dataRef = useRef(data);

  // Keep ref in sync so interval always uses latest data
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(async () => {
      setIsAutoSaving(true);
      try {
        await onSave(dataRef.current);
        setLastSaved(format(new Date(), 'h:mm a'));
      } catch {
        // Silently fail on autosave
      } finally {
        setIsAutoSaving(false);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, interval, onSave]);

  return { lastSaved, isAutoSaving };
};