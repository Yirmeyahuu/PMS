import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Timer, User, FileText, AlertCircle, UserPlus, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getPatients } from '@/features/patients/patient.api';
import { createAppointment } from '../appointment.api';
import { usePractitioners } from '@/features/clinics/hooks/usePractitioners';
import { useAuthStore } from '@/store/auth.store';
import type { Patient, CreateAppointmentData } from '@/types';
import toast from 'react-hot-toast';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: {
    date: Date;
    time: string;
    hour: number;
    minutes: number;
    duration: number;
  } | null;
}

interface AppointmentFormData {
  patient: number | '';
  practitioner: number | ''; // ✅ NEW
  appointment_type: string;
  chief_complaint: string;
  notes: string;
  patient_notes: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedSlot,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ NEW: Load practitioners
  const { practitioners, loading: loadingPractitioners } = usePractitioners();

  const [formData, setFormData] = useState<AppointmentFormData>({
    patient: '',
    practitioner: '', // ✅ NEW
    appointment_type: 'INITIAL',
    chief_complaint: '',
    notes: '',
    patient_notes: '',
  });

  // Load patients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await getPatients({ is_active: true, page_size: 1000 });
      setPatients(response.results || []);
    } catch (error) {
      console.error('Failed to load patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patient) {
      newErrors.patient = 'Please select a patient';
    }
    if (!formData.appointment_type) {
      newErrors.appointment_type = 'Please select appointment type';
    }
    // ✅ NEW: Practitioner is optional, no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedSlot || !user?.clinic) {
      return;
    }

    setSaving(true);

    try {
      // Calculate end time
      const endMinutes = selectedSlot.hour * 60 + selectedSlot.minutes + selectedSlot.duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;

      const appointmentData: CreateAppointmentData = {
        clinic: user.clinic,
        patient: Number(formData.patient),
        // ✅ NEW: Include practitioner if selected
        ...(formData.practitioner && { practitioner: Number(formData.practitioner) }),
        appointment_type: formData.appointment_type,
        date: format(selectedSlot.date, 'yyyy-MM-dd'),
        start_time: `${selectedSlot.hour.toString().padStart(2, '0')}:${selectedSlot.minutes.toString().padStart(2, '0')}`,
        end_time: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
        duration_minutes: selectedSlot.duration,
        chief_complaint: formData.chief_complaint,
        notes: formData.notes,
        patient_notes: formData.patient_notes,
      };

      await createAppointment(appointmentData);
      
      toast.success('Appointment created successfully!');
      handleClose();
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          'Failed to create appointment';
      toast.error(errorMessage);
      
      if (error.response?.data) {
        console.error('Validation errors:', error.response.data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      patient: '',
      practitioner: '', // ✅ NEW
      appointment_type: 'INITIAL',
      chief_complaint: '',
      notes: '',
      patient_notes: '',
    });
    setErrors({});
    onClose();
  };

  const handleCreatePatient = () => {
    handleClose();
    navigate('/clients', { state: { openCreateModal: true } });
  };

  if (!isOpen || !selectedSlot) return null;

  // Format times
  const formattedDate = format(selectedSlot.date, 'EEEE, MMMM d, yyyy');
  const formattedTime = `${selectedSlot.hour > 12 ? selectedSlot.hour - 12 : selectedSlot.hour}:${selectedSlot.minutes.toString().padStart(2, '0')} ${selectedSlot.hour >= 12 ? 'PM' : 'AM'}`;
  
  const endMinutes = selectedSlot.hour * 60 + selectedSlot.minutes + selectedSlot.duration;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const formattedEndTime = `${endHour > 12 ? endHour - 12 : endHour}:${endMin.toString().padStart(2, '0')} ${endHour >= 12 ? 'PM' : 'AM'}`;

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl pointer-events-auto transform transition-all duration-300 scale-100 opacity-100 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Appointment</h2>
                <p className="text-sm text-gray-600">Schedule a new appointment</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Selected Time Display */}
              <div className="bg-sky-50 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sky-700">
                    <Calendar className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-700">
                    <Clock className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">
                      {formattedTime} - {formattedEndTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-700">
                    <Timer className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">
                      {formatDuration(selectedSlot.duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient / Client <span className="text-red-500">*</span>
                </label>
                
                {loadingPatients ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                  </div>
                ) : patients.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-2">
                          No patients found
                        </p>
                        <p className="text-sm text-yellow-700 mb-3">
                          You need to create a patient before scheduling an appointment.
                        </p>
                        <button
                          type="button"
                          onClick={handleCreatePatient}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          Create New Patient
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        name="patient"
                        value={formData.patient}
                        onChange={handleChange}
                        className={`
                          w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500
                          ${errors.patient ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                        `}
                        required
                      >
                        <option value="">Select a patient...</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.full_name} - {patient.patient_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.patient && (
                      <p className="mt-1 text-sm text-red-600">{errors.patient}</p>
                    )}
                    
                    {/* Quick Create Button */}
                    <button
                      type="button"
                      onClick={handleCreatePatient}
                      className="mt-2 text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Create new patient
                    </button>
                  </>
                )}
              </div>

              {/* ✅ NEW: Practitioner Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assigned Practitioner
                  <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
                </label>
                
                {loadingPractitioners ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                  </div>
                ) : (
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      name="practitioner"
                      value={formData.practitioner}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Unassigned</option>
                      {practitioners.map((practitioner) => (
                        <option key={practitioner.id} value={practitioner.id}>
                          {practitioner.name}
                          {practitioner.specialization && ` - ${practitioner.specialization}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {practitioners.length === 0 
                    ? 'No practitioners available. Contact admin to add practitioners.'
                    : 'Select a practitioner or leave unassigned to assign later.'
                  }
                </p>
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Appointment Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="appointment_type"
                  value={formData.appointment_type}
                  onChange={handleChange}
                  className={`
                    w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500
                    ${errors.appointment_type ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                  required
                >
                  <option value="INITIAL">Initial Consultation</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="THERAPY">Therapy Session</option>
                  <option value="ASSESSMENT">Assessment</option>
                </select>
                {errors.appointment_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.appointment_type}</p>
                )}
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chief Complaint
                </label>
                <textarea
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  placeholder="Primary reason for visit..."
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Internal Notes
                  <span className="ml-2 text-xs font-normal text-gray-500">(Staff only)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    placeholder="Internal notes for staff..."
                  />
                </div>
              </div>

              {/* Patient Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient Notes
                  <span className="ml-2 text-xs font-normal text-gray-500">(Visible to patient)</span>
                </label>
                <textarea
                  name="patient_notes"
                  value={formData.patient_notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  placeholder="Notes for patient..."
                />
              </div>

              {/* Created By Info */}
              {user && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Created by:</span>
                      <span className="ml-2 text-gray-600">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {format(new Date(), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer - Fixed */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={saving || patients.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Create Appointment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};