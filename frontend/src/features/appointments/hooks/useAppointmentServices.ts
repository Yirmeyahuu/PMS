import { useState, useEffect } from 'react';
import { clinicServicesApi } from '@/features/manage/services/clinic-services.api';
import type { ClinicService } from '@/features/manage/services/clinic-services.api';



/**
 * Lightweight hook used inside AppointmentModal / AppointmentEditForm.
 * Fetches only active services for the appointment service picker.
 */
export const useAppointmentServices = () => {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await clinicServicesApi.list();
        if (!cancelled) setServices(data.filter(s => s.is_active));
      } catch {
        if (!cancelled) setError('Failed to load services.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, []);

  return { services, loading, error };
};