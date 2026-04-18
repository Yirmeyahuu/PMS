import React, { useState, useCallback, useMemo } from 'react';
import { X, Calendar, Clock, FileText, Users, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { createBlockAppointment } from '../appointment.api';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { useBlockConflictDetection } from '../hooks/useBlockConflictDetection';
import { useClinicUsers } from '../hooks/useClinicUsers';
import { ConflictModal } from './ConflictModal';
import { UserSelector } from './UserSelector';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import type { BlockAppointment, Appointment } from '@/types';

interface AddDragEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (event: BlockAppointment) => void;
  selectedClinicBranchId?: number | null;
  // Pre-filled data from drag-drop
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  // Appointments for conflict detection
  appointments?: Appointment[];
}

interface FormData {
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  visibility_type: 'ALL' | 'SELECTED';
  visible_to_user_ids: number[];
}

export const AddDragEventModal: React.FC<AddDragEventModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  selectedClinicBranchId,
  initialDate,
  initialStartTime,
  initialEndTime,
  appointments = [],
}) => {
  const { user: currentUser } = useAuthStore();
  const { branches } = useClinicBranches();
  const { users, loading: loadingUsers } = useClinicUsers(selectedClinicBranchId);
  
  // Filter out current user from selection
  const filteredUsers = useMemo(() => {
    return users.filter(user => user.id !== currentUser?.id);
  }, [users, currentUser?.id]);
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Conflict detection
  const { getFirstConflict } = useBlockConflictDetection(appointments);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingAppointment, setConflictingAppointment] = useState<{
    appointment: Appointment;
    blockStartTime: string;
    blockEndTime: string;
  } | null>(null);
  const [pendingBlockData, setPendingBlockData] = useState<{
    clinicId: number;
    event_name: string;
    date: string;
    start_time: string;
    end_time: string;
    notes: string;
    visibility_type: 'ALL' | 'SELECTED';
    visible_to_user_ids: number[];
  } | null>(null);

  const getInitialFormData = (): FormData => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      event_name: '',
      date: initialDate ? format(initialDate, 'yyyy-MM-dd') : today,
      start_time: initialStartTime || '09:00',
      end_time: initialEndTime || '10:00',
      notes: '',
      visibility_type: 'ALL',
      visible_to_user_ids: [],
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData);

  // Reset form when modal opens with new initial values
  React.useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
      setShowConflictModal(false);
      setConflictingAppointment(null);
      setPendingBlockData(null);
    }
  }, [isOpen, initialDate, initialStartTime, initialEndTime]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Event name is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }
    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }
    // Validate end time is after start time
    if (formData.start_time && formData.end_time) {
      if (formData.end_time <= formData.start_time) {
        newErrors.end_time = 'End time must be after start time';
      }
    }    // Validate visibility
    if (formData.visibility_type === 'SELECTED' && formData.visible_to_user_ids.length === 0) {
      newErrors.visible_to_user_ids = 'Select at least one user';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check for conflicts before submitting
  const checkForConflicts = useCallback((): { hasConflict: boolean; conflict: ReturnType<typeof getFirstConflict> } => {
    const conflict = getFirstConflict({
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
    });
    return { hasConflict: !!conflict, conflict };
  }, [formData.date, formData.start_time, formData.end_time, getFirstConflict]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Check for conflicts
    const { hasConflict, conflict } = checkForConflicts();
    
    if (hasConflict && conflict) {
      // Store pending data and show conflict modal
      const clinicId = selectedClinicBranchId || branches[0]?.id;
      if (clinicId) {
        setPendingBlockData({
          clinicId,
          event_name: formData.event_name,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          notes: formData.notes,
          visibility_type: formData.visibility_type,
          visible_to_user_ids: formData.visible_to_user_ids,
        });
        setConflictingAppointment(conflict);
        setShowConflictModal(true);
      }
      return;
    }

    // No conflict, proceed with creation
    await createBlockEvent();
  };

  const createBlockEvent = async () => {
    setSaving(true);
    try {
      // Determine which clinic to use
      const clinicId = pendingBlockData?.clinicId || selectedClinicBranchId || branches[0]?.id;
      if (!clinicId) {
        toast.error('No clinic branch available');
        setSaving(false);
        return;
      }

      const data = pendingBlockData || {
        clinicId,
        event_name: formData.event_name,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        visibility_type: formData.visibility_type,
        visible_to_user_ids: formData.visible_to_user_ids,
      };

      const payload: any = {
        clinic: data.clinicId,
        event_name: data.event_name,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: data.notes,
        visibility_type: data.visibility_type,
      };

      // Only include visible_to_user_ids if visibility_type is SELECTED
      if (data.visibility_type === 'SELECTED') {
        payload.visible_to_user_ids = data.visible_to_user_ids;
      }

      const created = await createBlockAppointment(payload);

      toast.success('Event created successfully');
      onCreated?.(created);
      handleClose();
    } catch (err: unknown) {
      console.error('Failed to create event:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail 
        : 'Failed to create event';
      toast.error(errorMessage ?? 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setShowConflictModal(false);
    setConflictingAppointment(null);
    setPendingBlockData(null);
    onClose();
  };

  // Handle conflict modal actions
  const handleBlockExisting = async () => {
    // Proceed with creating the block event despite conflict
    // Both block and existing appointment will be displayed together
    setShowConflictModal(false);
    setConflictingAppointment(null);
    await createBlockEvent();
  };

  const handleRescheduleExisting = () => {
    // Cancel block creation, prompt user to reschedule existing appointment
    setShowConflictModal(false);
    setConflictingAppointment(null);
    setPendingBlockData(null);
    // Show toast for rescheduling
    if (conflictingAppointment) {
      toast('Please drag the existing appointment to a new time before creating the block appointment.', {
        icon: '📅',
        duration: 5000,
      });
    }
  };

  const handleCancelConflict = () => {
    // Cancel everything
    setShowConflictModal(false);
    setConflictingAppointment(null);
    setPendingBlockData(null);
  };

  if (!isOpen) return null;

  // Generate time options (30-minute intervals from 6 AM to 9 PM)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 6; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        times.push({ value: time, label: `${displayHour}:${String(minute).padStart(2, '0')} ${period}` });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Event</h2>
              <p className="text-sm text-gray-500">
                {initialDate ? 'Creating event from drag-drop' : 'Block a time slot in the calendar'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.event_name}
                onChange={(e) => handleChange('event_name', e.target.value)}
                placeholder="e.g., Staff Meeting, Clinic Holiday"
                className={`
                  w-full px-4 py-2.5 rounded-lg border transition-colors
                  focus:ring-2 focus:ring-offset-1 focus:outline-none
                  ${errors.event_name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-sky-500 focus:ring-sky-200'
                  }
                `}
              />
              {errors.event_name && (
                <p className="mt-1 text-xs text-red-500">{errors.event_name}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={`
                  w-full px-4 py-2.5 rounded-lg border transition-colors
                  focus:ring-2 focus:ring-offset-1 focus:outline-none
                  ${errors.date 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-sky-500 focus:ring-sky-200'
                  }
                `}
              />
              {errors.date && (
                <p className="mt-1 text-xs text-red-500">{errors.date}</p>
              )}
            </div>

            {/* Time Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Start Time <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  className={`
                    w-full px-4 py-2.5 rounded-lg border transition-colors
                    focus:ring-2 focus:ring-offset-1 focus:outline-none
                    ${errors.start_time 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-sky-500 focus:ring-sky-200'
                    }
                  `}
                >
                  <option value="">Select time</option>
                  {timeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.start_time && (
                  <p className="mt-1 text-xs text-red-500">{errors.start_time}</p>
                )}
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  End Time <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  className={`
                    w-full px-4 py-2.5 rounded-lg border transition-colors
                    focus:ring-2 focus:ring-offset-1 focus:outline-none
                    ${errors.end_time 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-sky-500 focus:ring-sky-200'
                    }
                  `}
                >
                  <option value="">Select time</option>
                  {timeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.end_time && (
                  <p className="mt-1 text-xs text-red-500">{errors.end_time}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any additional details about this event..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:ring-offset-1 focus:outline-none resize-none"
              />
            </div>

            {/* Visibility Controls */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Visibility
              </label>

              {/* Visibility Type Radio Buttons */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-sky-200 hover:bg-sky-50 transition-colors">
                  <input
                    type="radio"
                    name="visibility_type"
                    value="ALL"
                    checked={formData.visibility_type === 'ALL'}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, visibility_type: 'ALL' as const }));
                      if (errors.visible_to_user_ids) {
                        setErrors(prev => ({ ...prev, visible_to_user_ids: '' }));
                      }
                    }}
                    className="mt-0.5 w-4 h-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">All Users</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Everyone in the clinic can see this block event
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-amber-200 hover:bg-amber-50 transition-colors">
                  <input
                    type="radio"
                    name="visibility_type"
                    value="SELECTED"
                    checked={formData.visibility_type === 'SELECTED'}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, visibility_type: 'SELECTED' as const }));
                    }}
                    className="mt-0.5 w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Selected Users</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Only specific users can see this block event
                    </p>
                  </div>
                </label>
              </div>

              {/* User Selection - Show only when SELECTED is chosen */}
              {formData.visibility_type === 'SELECTED' && (
                <div className="pl-7">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Select Users <span className="text-red-500">*</span>
                  </label>
                  <UserSelector
                    users={filteredUsers}
                    selectedUserIds={formData.visible_to_user_ids}
                    onSelectionChange={(ids) => {
                      setFormData(prev => ({ ...prev, visible_to_user_ids: ids }));
                      if (errors.visible_to_user_ids) {
                        setErrors(prev => ({ ...prev, visible_to_user_ids: '' }));
                      }
                    }}
                    disabled={loadingUsers}
                    error={errors.visible_to_user_ids}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Conflict Modal */}
      <ConflictModal
        isOpen={showConflictModal}
        conflictingAppointment={conflictingAppointment}
        onBlockExisting={handleBlockExisting}
        onRescheduleExisting={handleRescheduleExisting}
        onCancel={handleCancelConflict}
      />
    </>
  );
};