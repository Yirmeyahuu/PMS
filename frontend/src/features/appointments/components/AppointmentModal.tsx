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
  practitioner: number | '';
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

  const { practitioners, loading: loadingPractitioners } = usePractitioners();

  const [formData, setFormData] = useState<AppointmentFormData>({
    patient: '',
    practitioner: '',
    appointment_type: 'INITIAL',
    chief_complaint: '',
    notes: '',
    patient_notes: '',
  });

  useEffect(() => {
    if (isOpen) loadPatients();
  }, [isOpen]);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await getPatients({ is_active: true, page_size: 1000 });
      setPatients(response.results || []);
    } catch (error) {
      toast.error('Failed to load patients');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.patient) newErrors.patient = 'Please select a patient';
    if (!formData.appointment_type) newErrors.appointment_type = 'Please select appointment type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedSlot || !user?.clinic) return;

    setSaving(true);
    try {
      const endMinutes = selectedSlot.hour * 60 + selectedSlot.minutes + selectedSlot.duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;

      const appointmentData: CreateAppointmentData = {
        clinic: user.clinic,
        patient: Number(formData.patient),
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
      toast.error(error.response?.data?.detail || error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ patient: '', practitioner: '', appointment_type: 'INITIAL', chief_complaint: '', notes: '', patient_notes: '' });
    setErrors({});
    onClose();
  };

  const handleCreatePatient = () => {
    handleClose();
    navigate('/clients', { state: { openCreateModal: true } });
  };

  if (!isOpen || !selectedSlot) return null;

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

  const inputBase = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent';
  const inputError = 'border-red-300 bg-red-50';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300" onClick={handleClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">New Appointment</h2>
                <p className="text-xs text-gray-500">Schedule a new appointment</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close modal">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Selected Slot */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sky-700">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-700">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{formattedTime} – {formattedEndTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-700">
                    <Timer className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{formatDuration(selectedSlot.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Patient */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Patient / Client <span className="text-red-500">*</span>
                </label>
                {loadingPatients ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-600 border-t-transparent" />
                  </div>
                ) : patients.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 mb-1">No patients found</p>
                        <p className="text-xs text-amber-700 mb-3">Create a patient before scheduling an appointment.</p>
                        <button
                          type="button"
                          onClick={handleCreatePatient}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Create New Patient
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        name="patient"
                        value={formData.patient}
                        onChange={handleChange}
                        className={`${inputBase} pl-9 ${errors.patient ? inputError : ''}`}
                        required
                      >
                        <option value="">Select a patient...</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} — {p.patient_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.patient && <p className="mt-1 text-xs text-red-600">{errors.patient}</p>}
                    <button
                      type="button"
                      onClick={handleCreatePatient}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Create new patient
                    </button>
                  </>
                )}
              </div>

              {/* Practitioner */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Assigned Practitioner
                  <span className="ml-2 text-xs font-normal text-gray-400">(Optional)</span>
                </label>
                {loadingPractitioners ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-600 border-t-transparent" />
                  </div>
                ) : (
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      name="practitioner"
                      value={formData.practitioner}
                      onChange={handleChange}
                      className={`${inputBase} pl-9`}
                    >
                      <option value="">Unassigned</option>
                      {practitioners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.specialization && ` — ${p.specialization}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {practitioners.length === 0
                    ? 'No practitioners available. Contact admin to add practitioners.'
                    : 'Select a practitioner or leave unassigned to assign later.'}
                </p>
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Appointment Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="appointment_type"
                  value={formData.appointment_type}
                  onChange={handleChange}
                  className={`${inputBase} ${errors.appointment_type ? inputError : ''}`}
                  required
                >
                  <option value="INITIAL">Initial Consultation</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="THERAPY">Therapy Session</option>
                  <option value="ASSESSMENT">Assessment</option>
                </select>
                {errors.appointment_type && <p className="mt-1 text-xs text-red-600">{errors.appointment_type}</p>}
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chief Complaint</label>
                <textarea
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleChange}
                  rows={2}
                  className={`${inputBase} resize-none`}
                  placeholder="Primary reason for visit..."
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Internal Notes
                  <span className="ml-2 text-xs font-normal text-gray-400">(Staff only)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className={`${inputBase} pl-9 resize-none`}
                    placeholder="Internal notes for staff..."
                  />
                </div>
              </div>

              {/* Patient Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Patient Notes
                  <span className="ml-2 text-xs font-normal text-gray-400">(Visible to patient)</span>
                </label>
                <textarea
                  name="patient_notes"
                  value={formData.patient_notes}
                  onChange={handleChange}
                  rows={3}
                  className={`${inputBase} resize-none`}
                  placeholder="Notes for patient..."
                />
              </div>

              {/* Created by */}
              {user && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Created by: <span className="font-medium text-gray-700">{user.first_name} {user.last_name}</span>
                    </span>
                    <span className="text-gray-400">{format(new Date(), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={saving || patients.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
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