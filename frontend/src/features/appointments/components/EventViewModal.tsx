import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, User, Pencil, Trash2, AlertTriangle, Users, Globe, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { updateBlockAppointment, deleteBlockAppointment } from '../appointment.api';
import { useClinicUsers } from '../hooks/useClinicUsers';
import { UserSelector } from './UserSelector';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import type { BlockAppointment, CreateBlockAppointmentData } from '@/types';

interface EventViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: BlockAppointment | null;
  onUpdated?: (event: BlockAppointment) => void;
  onDeleted?: (eventId: number) => void;
}

interface FormData {
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  visibility_type: 'ALL' | 'SELECTED' | 'SELF';
  visible_to_user_ids: number[];
}

export const EventViewModal: React.FC<EventViewModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdated,
  onDeleted,
}) => {
  const { user: currentUser } = useAuthStore();
  const { users, loading: loadingUsers } = useClinicUsers(event?.clinic);
  
  // Filter out current user from selection
  const filteredUsers = useMemo(() => {
    return users.filter(user => user.id !== currentUser?.id);
  }, [users, currentUser?.id]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getInitialFormData = (): FormData => {
    if (!event) {
      return {
        event_name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        visibility_type: 'ALL',
        visible_to_user_ids: [],
      };
    }
    return {
      event_name: event.event_name,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      notes: event.notes || '',
      visibility_type: event.visibility_type || 'ALL',
      visible_to_user_ids: event.visible_to_user_ids || [],
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData);

  // Reset form when event changes
  useEffect(() => {
    if (event && isOpen) {
      setFormData({
        event_name: event.event_name,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        notes: event.notes || '',
        visibility_type: event.visibility_type || 'ALL',
        visible_to_user_ids: event.visible_to_user_ids || [],
      });
      setIsEditing(false);
      setIsDeleting(false);
      setErrors({});
    }
  }, [event, isOpen]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    // Validate time order
    if (formData.start_time && formData.end_time) {
      if (formData.start_time >= formData.end_time) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    // Validate visibility
    if (formData.visibility_type === 'SELECTED' && formData.visible_to_user_ids.length === 0) {
      newErrors.visible_to_user_ids = 'Select at least one user';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!event || !validate()) return;

    setSaving(true);
    try {
      const payload: Partial<CreateBlockAppointmentData> = {
        event_name: formData.event_name,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        visibility_type: formData.visibility_type,
      };

      // Only include visible_to_user_ids if visibility_type is SELECTED
      if (formData.visibility_type === 'SELECTED') {
        payload.visible_to_user_ids = formData.visible_to_user_ids;
      }

      const updated = await updateBlockAppointment(event.id, payload);
      toast.success('Event updated successfully');
      setIsEditing(false);
      onUpdated?.(updated);
    } catch (err: unknown) {
      console.error('Failed to update event:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update event';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    setSaving(true);
    try {
      await deleteBlockAppointment(event.id);
      toast.success('Event deleted successfully');
      onDeleted?.(event.id);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to delete event:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete event';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !event) return null;

  // Helper to format time in 12-hour format
  const formatTime12Hour = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Format date and time for display
  const formattedDate = (() => {
    try {
      return format(parseISO(event.date), 'EEEE, MMMM d, yyyy');
    } catch {
      return event.date;
    }
  })();

  const formattedTime = `${formatTime12Hour(event.start_time)} - ${formatTime12Hour(event.end_time)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl mx-4 overflow-hidden w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Event' : isDeleting ? 'Delete Event' : 'Event Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isDeleting ? (
            /* Delete Confirmation */
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <AlertTriangle className="w-12 h-12 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Event?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{event.event_name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setIsDeleting(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </div>
          ) : isEditing ? (
            /* Edit Form - 2-Column Layout matching AddEventModal */
            <div className="grid grid-cols-2 gap-6">
              {/* LEFT COLUMN - Event Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4" />
                  Event Details
                </h3>

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
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:ring-offset-1 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* RIGHT COLUMN - User Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4" />
                  User Selection
                </h3>

                {/* Visibility Controls */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Who can see this event?
                  </label>

                  {/* Visibility Type Radio Buttons */}
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-sky-200 hover:bg-sky-50 transition-colors">
                      <input
                        type="radio"
                        name="visibility_type"
                        value="ALL"
                        checked={formData.visibility_type === 'ALL'}
                        onChange={() => {
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
                        onChange={() => {
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

                    <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-purple-200 hover:bg-purple-50 transition-colors">
                      <input
                        type="radio"
                        name="visibility_type"
                        value="SELF"
                        checked={formData.visibility_type === 'SELF'}
                        onChange={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            visibility_type: 'SELF' as const,
                            visible_to_user_ids: [] // Clear selected users
                          }));
                          if (errors.visible_to_user_ids) {
                            setErrors(prev => ({ ...prev, visible_to_user_ids: '' }));
                          }
                        }}
                        className="mt-0.5 w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Myself Only</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Only you can see this block event (private)
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* User Selection - Show only when SELECTED is chosen */}
                  {formData.visibility_type === 'SELECTED' && (
                    <div>
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

                {/* Audit Information */}
                <div className="border-t border-gray-200 pt-4 mt-6 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Audit Trail
                  </h4>

                  {/* Created By */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                      <User className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-gray-500">
                        Created By
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {event?.created_by_name || 'Unknown'}
                      </p>
                      {event?.created_at && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(parseISO(event.created_at), 'MMM d, yyyy - h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Modified By - Only show if event was modified */}
                  {event?.modified_by_name && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-gray-500">
                          Last Modified By
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {event.modified_by_name}
                        </p>
                        {event.updated_at && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(parseISO(event.updated_at), 'MMM d, yyyy - h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* View Mode - Event Details - 2-Column Layout */
            <div className="grid grid-cols-2 gap-6">
              {/* LEFT COLUMN - Event Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4" />
                  Event Information
                </h3>

                {/* Event Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Event Name
                  </label>
                  <p className="text-base font-semibold text-gray-900">{event.event_name}</p>
                </div>

                {/* Date */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                    <Calendar className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      Date
                    </label>
                    <p className="text-sm font-medium text-gray-900">{formattedDate}</p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                    <Clock className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      Time
                    </label>
                    <p className="text-sm font-medium text-gray-900">{formattedTime}</p>
                  </div>
                </div>

                {/* Notes */}
                {event.notes && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Notes
                    </label>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
                      {event.notes}
                    </p>
                  </div>
                )}

                {/* Visibility */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                      {event.visibility_type === 'ALL' ? (
                        <Globe className="w-5 h-5 text-sky-600" />
                      ) : event.visibility_type === 'SELF' ? (
                        <User className="w-5 h-5 text-sky-600" />
                      ) : (
                        <Users className="w-5 h-5 text-sky-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Visibility
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {event.visibility_type === 'ALL' 
                            ? 'All Users' 
                            : event.visibility_type === 'SELF'
                            ? 'Myself Only'
                            : `Selected Users (${event.visible_to_user_names?.length || 0})`
                          }
                        </p>
                        {/* Visibility Badge */}
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${event.visibility_type === 'ALL' ? 'bg-sky-100 text-sky-700' : ''}
                          ${event.visibility_type === 'SELF' ? 'bg-purple-100 text-purple-700' : ''}
                          ${event.visibility_type === 'SELECTED' ? 'bg-amber-100 text-amber-700' : ''}
                        `}>
                          {event.visibility_type === 'SELF' && '👤 Private'}
                          {event.visibility_type === 'ALL' && '👥 Public'}
                          {event.visibility_type === 'SELECTED' && `👥 ${event.visible_to_user_names?.length || 0}`}
                        </span>
                      </div>
                      {event.visibility_type === 'SELECTED' && event.visible_to_user_names && event.visible_to_user_names.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {event.visible_to_user_names.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - Audit Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <User className="w-4 h-4" />
                  Audit Trail
                </h3>

                {/* Created By */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                    <User className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      Created By
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {event.created_by_name || 'Unknown'}
                    </p>
                    {event.created_at && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(parseISO(event.created_at), 'MMM d, yyyy - h:mm a')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Modified By - Only show if event was modified */}
                {event.modified_by_name && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Last Modified By
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {event.modified_by_name}
                      </p>
                      {event.updated_at && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(parseISO(event.updated_at), 'MMM d, yyyy - h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Info Card */}
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mt-6">
                  <h4 className="text-xs font-semibold text-sky-800 uppercase tracking-wide mb-2">
                    Event Type
                  </h4>
                  <p className="text-sm text-sky-700">
                    Block Appointment
                  </p>
                  <p className="text-xs text-sky-600 mt-1">
                    This event blocks the calendar for the specified time period.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEditing && !isDeleting && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setIsDeleting(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}

        {/* Edit Footer */}
        {isEditing && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
