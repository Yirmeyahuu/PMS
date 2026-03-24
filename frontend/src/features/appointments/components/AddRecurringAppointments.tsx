import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Repeat, Save, CheckCircle, AlertCircle, RefreshCw, Building2, MapPin } from 'lucide-react';
import { format, addWeeks, addMonths, addYears, eachDayOfInterval, addDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { billingApi, type ClinicService } from '@/features/billing/billing.api';
import { checkRecurringAvailability } from '../appointment.api';
import type { Appointment } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSave?: (recurringData: RecurringAppointmentData) => void;
}

export interface RecurringAppointmentData {
  service_id: number;
  duration_minutes: number;
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  repetitions: number;
  selected_days: number[]; // 0=Monday, 6=Sunday
  start_date: string;
  practitioner_id: number | null;
  start_time: string;
}

// Day options for selection
const DAYS_OF_WEEK = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];

// Frequency options
const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

interface TimeSlot {
  date: string;
  day_name: string;
  time: string;
  status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE';
}

export const AddRecurringAppointments: React.FC<Props> = ({
  isOpen,
  onClose,
  appointment,
  onSave,
}) => {
  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [duration, setDuration] = useState<number>(30);
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [repetitions, setRepetitions] = useState<number>(4);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch clinic services
  const { data: clinicServices = [], isLoading: loadingServices } = useQuery<ClinicService[]>({
    queryKey: ['clinic-services'],
    queryFn: () => billingApi.getClinicServices(),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      // If appointment has a service, try to match it
      if (appointment.service) {
        const matchingService = clinicServices.find(s => s.id === appointment.service);
        if (matchingService) {
          setSelectedServiceId(matchingService.id);
          setDuration(matchingService.duration_minutes);
        }
      } else {
        // Default to first service if available
        if (clinicServices.length > 0) {
          setSelectedServiceId(clinicServices[0].id);
          setDuration(clinicServices[0].duration_minutes);
        }
      }
      
      // Set default duration from appointment
      if (appointment.duration_minutes) {
        setDuration(appointment.duration_minutes);
      }
      
      // Set default repetitions
      setRepetitions(4);
      
      // Set selected day based on appointment date
      const appointmentDate = new Date(appointment.date);
      const dayOfWeek = appointmentDate.getDay();
      // Convert from Sunday=0 to Monday=0 format
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      setSelectedDays([adjustedDay]);
      
      // Set start time from appointment - ensure HH:MM format
      const formattedTime = appointment.start_time ? appointment.start_time.substring(0, 5) : '09:00';
      setStartTime(formattedTime);
      
      setAvailableSlots([]);
    }
  }, [isOpen, appointment, clinicServices]);

  // Update duration when service changes
  useEffect(() => {
    if (selectedServiceId) {
      const service = clinicServices.find(s => s.id === selectedServiceId);
      if (service) {
        setDuration(service.duration_minutes);
      }
    }
  }, [selectedServiceId, clinicServices]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Calculate end date based on frequency and repetitions
  const calculateEndDate = (start: string, freq: string, reps: number): Date => {
    const startD = new Date(start);
    switch (freq) {
      case 'WEEKLY':
        return addWeeks(startD, reps);
      case 'MONTHLY':
        return addMonths(startD, reps);
      case 'YEARLY':
        return addYears(startD, reps);
      default:
        return addWeeks(startD, reps);
    }
  };

  const handleCheckAvailability = async () => {
    if (!appointment || selectedDays.length === 0) return;
    
    setIsCheckingAvailability(true);
    
    // Use the NEXT DAY after current appointment date as start date (exclude current date)
    const nextDayDate = addDays(new Date(appointment.date), 1);
    const startDate = format(nextDayDate, 'yyyy-MM-dd');
    
    // Calculate the end date based on frequency and repetitions
    const start = new Date(startDate);
    const end = calculateEndDate(startDate, frequency, repetitions);
    
    // Get all dates within the range
    const dates = eachDayOfInterval({ start, end });
    
    // Filter dates to only selected days of the week
    const filteredDates = dates.filter(date => {
      const dayOfWeek = date.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      return selectedDays.includes(adjustedDay);
    });

    // Extract just the date strings
    const dateStrings = filteredDates.map(date => format(date, 'yyyy-MM-dd'));
    
    try {
      // Ensure start_time is in HH:MM format
      const formattedStartTime = startTime.substring(0, 5);
      
      // Call the backend API to check availability
      console.log('Checking availability with:', {
        practitioner_id: appointment.practitioner,
        dates: dateStrings,
        start_time: formattedStartTime,
        duration_minutes: duration,
      });
      
      const response = await checkRecurringAvailability({
        practitioner_id: appointment.practitioner,
        dates: dateStrings,
        start_time: formattedStartTime,
        duration_minutes: duration,
      });
      
      // Map the response to our TimeSlot format
      const slots: TimeSlot[] = response.slots.map(slot => ({
        date: slot.date,
        day_name: slot.day_name,
        time: slot.time,
        status: slot.status === 'BOOKED' ? 'BOOKED' : 'AVAILABLE',
      }));
      
      setAvailableSlots(slots);
    } catch (err) {
      const error = err as { response?: { data?: unknown; status?: number } };
      console.error('Failed to check availability:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      // Fallback: show all as available if API fails
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const fallbackSlots: TimeSlot[] = filteredDates.map(date => {
        const dayOfWeek = date.getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return {
          date: format(date, 'yyyy-MM-dd'),
          day_name: dayNames[adjustedDay],
          time: startTime,
          status: 'AVAILABLE' as const,
        };
      });
      setAvailableSlots(fallbackSlots);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSave = async () => {
    if (!appointment || !selectedServiceId || selectedDays.length === 0) {
      return;
    }

    setIsSaving(true);
    
    const recurringData: RecurringAppointmentData = {
      service_id: Number(selectedServiceId),
      duration_minutes: duration,
      frequency,
      repetitions,
      selected_days: selectedDays,
      start_date: format(addDays(new Date(appointment.date), 1), 'yyyy-MM-dd'), // Use next day as start date
      practitioner_id: appointment.practitioner || null,
      start_time: startTime.substring(0, 5), // Use user-selected start time (ensure HH:MM format)
    };

    try {
      // Call the save callback
      onSave?.(recurringData);
      onClose();
    } catch (error) {
      console.error('Failed to save recurring appointments:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const formattedDate = format(new Date(appointment.date), 'MMM d, yyyy');
  const formattedDuration = `${appointment.duration_minutes} minutes`;

  // Get frequency label
  const frequencyLabel = FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label || 'Weekly';
  const repetitionLabel = frequency === 'WEEKLY' ? 'weeks' : frequency === 'MONTHLY' ? 'months' : 'years';

  const isFormValid = selectedServiceId && selectedDays.length > 0 && repetitions > 0;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Repeat className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Add Recurring Appointments</h2>
                <p className="text-xs text-gray-500">Create repeated appointments for this patient</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Appointment Details - Read Only */}
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-3">
                    Current Appointment Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Current Date (used as Start Date) */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="text-sm font-semibold text-gray-800">{formattedDate}</p>
                      </div>
                    </div>
                    
                    {/* Start Time - Selected */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Start Time (Selected)</p>
                        <p className="text-sm font-semibold text-gray-800">{startTime}</p>
                      </div>
                    </div>
                    
                    {/* Duration */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm font-semibold text-gray-800">{formattedDuration}</p>
                      </div>
                    </div>
                    
                    {/* Practitioner Assigned */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Practitioner Assigned</p>
                        <p className="text-sm font-semibold text-gray-800">{appointment.practitioner_name || 'Unassigned'}</p>
                      </div>
                    </div>
                    
                    {/* Clinic Branch */}
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Clinic Branch</p>
                        <p className="text-sm font-semibold text-gray-800">{appointment.location_name || 'Main Clinic'}</p>
                      </div>
                    </div>
                    
                    {/* Appointment Type */}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Appointment Type</p>
                        <p className="text-sm font-semibold text-gray-800">{appointment.service_name || appointment.appointment_type || 'General'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recurring Appointments Options */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Recurring Appointments Options
                  </p>

                  {/* Appointment Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Appointment Type <span className="text-red-500">*</span>
                    </label>
                    {loadingServices ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading services...
                      </div>
                    ) : (
                      <select
                        value={selectedServiceId}
                        onChange={e => setSelectedServiceId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      >
                        <option value="">Select a service...</option>
                        {clinicServices.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name} (₱{parseFloat(service.price).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Duration (minutes) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={duration}
                      onChange={e => setDuration(Math.max(15, parseInt(e.target.value) || 15))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Time for recurring appointments
                    </p>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Frequency <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {FREQUENCY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFrequency(opt.value as 'WEEKLY' | 'MONTHLY' | 'YEARLY')}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            frequency === opt.value
                              ? 'bg-teal-50 text-teal-700 border-teal-300 ring-2 ring-teal-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Repetitions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Number of {repetitionLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={repetitions}
                      onChange={e => setRepetitions(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      {frequencyLabel} recurring for {repetitions} {repetitionLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Check Availability Status */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Check Availability Status
                  </p>

                  {/* Day Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Select Days <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selectedDays.includes(day.value)
                              ? 'bg-teal-50 text-teal-700 border-teal-300 ring-2 ring-teal-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {selectedDays.length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-2">
                        Selected: {selectedDays.map(d => DAYS_OF_WEEK.find(dow => dow.value === d)?.label).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Check Button */}
                  <button
                    onClick={handleCheckAvailability}
                    disabled={selectedDays.length === 0 || isCheckingAvailability}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {isCheckingAvailability ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Check Availability
                      </>
                    )}
                  </button>

                  {/* Availability Table */}
                  {availableSlots.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          {frequencyLabel} Schedule for {repetitions} {repetitionLabel}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {selectedDays.map(d => DAYS_OF_WEEK.find(dow => dow.value === d)?.label).join(' & ')} starting {formattedDate} at {appointment.start_time}
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Date</th>
                              <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Day</th>
                              <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Time</th>
                              <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {availableSlots.map((slot, idx) => (
                              <tr key={`${slot.date}-${slot.time}-${idx}`} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800 font-medium">
                                  {format(new Date(slot.date), 'MMM d, yyyy')}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{slot.day_name}</td>
                                <td className="px-3 py-2 text-gray-600">{slot.time}</td>
                                <td className="px-3 py-2">
                                  {slot.status === 'AVAILABLE' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                      <CheckCircle className="w-3 h-3" />
                                      Available
                                    </span>
                                  ) : slot.status === 'BOOKED' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                      <AlertCircle className="w-3 h-3" />
                                      Booked
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                      Unavailable
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedDays.length > 0 && !isCheckingAvailability && availableSlots.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      Click "Check Availability" to see schedule
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Recurring Appointments
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
