import { useState, useCallback } from 'react';
import { editAppointment, cancelAppointment } from '../appointment.api';
import type { AppointmentEditPayload, AppointmentCancelPayload } from '../appointment.api';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

interface UseAppointmentEditReturn {
  // Edit state
  isEditing:  boolean;
  isSaving:   boolean;
  isDirty:    boolean;
  editError:  string | null;

  // Cancel state
  isCancelling: boolean;
  cancelError:  string | null;

  // Actions
  startEdit:  () => void;
  cancelEdit: () => void;
  saveEdit:   (id: number, payload: AppointmentEditPayload) => Promise<Appointment | null>;
  cancelAppointmentAction: (
    id: number,
    payload: AppointmentCancelPayload
  ) => Promise<Appointment | null>;

  // Dirty tracking
  markDirty:  () => void;
  clearDirty: () => void;
}

export const useAppointmentEdit = (): UseAppointmentEditReturn => {
  const [isEditing,    setIsEditing]    = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [isDirty,      setIsDirty]      = useState(false);
  const [editError,    setEditError]    = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError,  setCancelError]  = useState<string | null>(null);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setIsDirty(false);
    setEditError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setIsDirty(false);
    setEditError(null);
  }, []);

  const markDirty  = useCallback(() => setIsDirty(true),  []);
  const clearDirty = useCallback(() => setIsDirty(false), []);

  const saveEdit = useCallback(
    async (id: number, payload: AppointmentEditPayload): Promise<Appointment | null> => {
      if (!isDirty) {
        toast('No changes to save.', { icon: 'ℹ️' });
        return null;
      }

      setIsSaving(true);
      setEditError(null);

      try {
        const updated = await editAppointment(id, payload);
        toast.success('Appointment updated successfully.');
        setIsEditing(false);
        setIsDirty(false);
        return updated;
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.non_field_errors?.[0] ||
          'Failed to save changes. Please try again.';
        setEditError(msg);
        toast.error(msg);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [isDirty]
  );

  const cancelAppointmentAction = useCallback(
    async (
      id: number,
      payload: AppointmentCancelPayload
    ): Promise<Appointment | null> => {
      setIsCancelling(true);
      setCancelError(null);

      try {
        const result = await cancelAppointment(id, payload);

        if (result.email_warning) {
          toast.success('Appointment cancelled.');
          toast(result.email_warning, { icon: '⚠️', duration: 6000 });
        } else if (result.email_sent) {
          toast.success('Appointment cancelled. Cancellation email sent to patient.');
        } else {
          toast.success('Appointment cancelled.');
        }

        return result;
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.cancellation_reason?.[0] ||
          'Failed to cancel appointment. Please try again.';
        setCancelError(msg);
        toast.error(msg);
        return null;
      } finally {
        setIsCancelling(false);
      }
    },
    []
  );

  return {
    isEditing,
    isSaving,
    isDirty,
    editError,
    isCancelling,
    cancelError,
    startEdit,
    cancelEdit,
    saveEdit,
    cancelAppointmentAction,
    markDirty,
    clearDirty,
  };
};