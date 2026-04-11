import { useState, useEffect } from 'react';
import { getMyClinic } from '@/features/clinics/clinic.api';

export interface ClinicSettings {
  emailEnabled: boolean;
  smsEnabled:   boolean;
  loading:      boolean;
}

// Module-level cache — only one API call per page load
let _cache: { emailEnabled: boolean; smsEnabled: boolean } | null = null;
let _promise: Promise<{ emailEnabled: boolean; smsEnabled: boolean }> | null = null;

async function fetchSettings(): Promise<{ emailEnabled: boolean; smsEnabled: boolean }> {
  if (_cache) return _cache;
  if (!_promise) {
    _promise = getMyClinic()
      .then((clinic) => {
        _cache = {
          emailEnabled: clinic.email_notifications_enabled ?? true,
          smsEnabled:   clinic.sms_notifications_enabled  ?? false,
        };
        return _cache;
      })
      .catch(() => {
        _promise = null; // allow retry on next mount
        return { emailEnabled: true, smsEnabled: false };
      });
  }
  return _promise;
}

export function useClinicSettings(): ClinicSettings {
  const [settings, setSettings] = useState<{ emailEnabled: boolean; smsEnabled: boolean }>({
    emailEnabled: _cache?.emailEnabled ?? true,
    smsEnabled:   _cache?.smsEnabled  ?? false,
  });
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) return;
    fetchSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  return { ...settings, loading };
}

/**
 * Call this after saving clinic notification preferences so the next hook
 * mount re-fetches fresh data instead of using the stale cache.
 */
export function invalidateClinicSettingsCache(): void {
  _cache   = null;
  _promise = null;
}
