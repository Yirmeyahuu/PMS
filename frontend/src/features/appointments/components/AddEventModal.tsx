import React, { useState } from 'react';
import { X, Calendar, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { createBlockAppointment } from '../appointment.api';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { useBlockConflictDetection } from '../hooks/useBlockConflictDetection';
import { ConflictModal } from './ConflictModal';
import toast from 'react-hot-toast';
import type { BlockAppointment, Appointment } from '@/types';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (event: BlockAppointment) => void;
  selectedClinicBranchId?: number | null;
  initialDate?: Date;
  initialTime?: string;
  initialEndTime?: string;
  appointments?: Appointment[];
}

interface FormData {
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  selectedClinicBranchId,
  initialDate,
  initialTime,
  initialEndTime,
  appointments = [],
}) => {
  const { branches } = useClinicBranches();
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
  } | null>(null);

  const getInitialFormData = (): FormData => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startTime = initialTime || '09:00';
    const endTime = initialEndTime || (initialTime ? calculateEndTime(initialTime, 60) : '10:00');

    return {
      event_name: '',
      date: initialDate ? format(initialDate, 'yyyy-MM-dd') : today,
      start_time: startTime,
      end_time: endTime,
      notes: '',
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData);

  // Reset form when modal opens with new initial values
  React.useEffect(() => {
    if (isOpen) {
      const startTime = initialTime || '09:00';
      const endTime   = initialEndTime || (initialTime ? calculateEndTime(initialTime, 60) : '10:00');
      setFormData({
        event_name: '',
        date:       initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        start_time: startTime,
        end_time:   endTime,
        notes:      '',
      });
      setErrors({});
      setShowConflictModal(false);
      setConflictingAppointment(null);
      setPendingBlockData(null);
    }
  }, [isOpen, initialDate, initialTime, initialEndTime]);

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Check for conflicts with existing appointments
    const conflict = getFirstConflict({
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
    });

    if (conflict) {
      // Store pending data and show conflict modal
      setPendingBlockData({
        clinicId: selectedClinicBranchId || branches[0]?.id || 0,
        event_name: formData.event_name,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
      });
      setConflictingAppointment(conflict);
      setShowConflictModal(true);
      return;
    }

    // No conflict, proceed with creation
    await createBlockEvent();
  };

  const createBlockEvent = async () => {
    if (!pendingBlockData && !formData.event_name) return;
    
    setSaving(true);
    try {
      // Determine which clinic to use
      const clinicId = selectedClinicBranchId || branches[0]?.id;
      if (!clinicId) {
        toast.error('No clinic branch available');
        setSaving(false);
        return;
      }

      const blockData = pendingBlockData || {
        clinicId,
        event_name: formData.event_name,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
      };

      const created = await createBlockAppointment({
        clinic: blockData.clinicId,
        event_name: blockData.event_name,
        date: blockData.date,
        start_time: blockData.start_time,
        end_time: blockData.end_time,
        notes: blockData.notes,
      });

      toast.success('Event created successfully');
      onCreated?.(created);
      onClose();
      setPendingBlockData(null);
    } catch (err: unknown) {
      console.error('Failed to create event:', err);
      const msg = err && typeof err === 'object' && 'response' in err 
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail 
        : 'Failed to create event';
      toast.error(msg ?? 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Event</h2>
            <p className="text-sm text-gray-500">Block a time slot in the calendar</p>
          </div>
          <button
            onClick={onClose}
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
              <input
                type="time"
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
              />
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
              <input
                type="time"
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
              />
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
      
      {/* Conflict Modal */}
      <ConflictModal
        isOpen={showConflictModal}
        conflictingAppointment={conflictingAppointment}
        onBlockExisting={async () => {
          // Proceed with creating block despite conflict
          setShowConflictModal(false);
          await createBlockEvent();
        }}
        onRescheduleExisting={() => {
          // Cancel block creation, prompt user to reschedule existing appointment
          setShowConflictModal(false);
          setConflictingAppointment(null);
          setPendingBlockData(null);
          toast('Please drag the existing appointment to a new time before creating the block appointment.', {
            icon: '📅',
            duration: 5000,
          });
        }}
        onCancel={() => {
          // Cancel block creation
          setShowConflictModal(false);
          setConflictingAppointment(null);
          setPendingBlockData(null);
        }}
      />
    </div>
  );
};