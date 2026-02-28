import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Heart,
  Calendar,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Activity,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react';
import { getPatient, updatePatient } from './patient.api';
import { getAppointments } from '@/features/appointments/appointment.api';
import type { Patient, Appointment, CreatePatientData } from '@/types';
import { PatientModal } from './components/PatientModal';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getGenderLabel = (gender: string) => {
  switch (gender) {
    case 'M': return 'Male';
    case 'F': return 'Female';
    case 'O': return 'Other';
    default: return gender;
  }
};

const APPOINTMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    color: 'bg-blue-50 text-blue-700',
    icon: <Clock className="w-3 h-3" />,
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-sky-50 text-sky-700',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  CHECKED_IN: {
    label: 'Checked In',
    color: 'bg-purple-50 text-purple-700',
    icon: <Activity className="w-3 h-3" />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-yellow-50 text-yellow-700',
    icon: <Activity className="w-3 h-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-50 text-green-700',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-50 text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
  NO_SHOW: {
    label: 'No Show',
    color: 'bg-gray-100 text-gray-600',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Initial Consultation',
  FOLLOW_UP: 'Follow-up',
  THERAPY: 'Therapy Session',
  ASSESSMENT: 'Assessment',
};

// ─── InfoRow ──────────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
  </div>
);

// ─── SectionCard ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}
const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sky-600">{icon}</span>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>
      )}
    </div>
  );
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────

interface PatientStatsProps {
  appointments: Appointment[];
}
const PatientStats: React.FC<PatientStatsProps> = ({ appointments }) => {
  const total     = appointments.length;
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
  const upcoming  = appointments.filter(
    (a) => ['SCHEDULED', 'CONFIRMED'].includes(a.status) && new Date(a.date) >= new Date()
  ).length;
  const noShow    = appointments.filter((a) => a.status === 'NO_SHOW').length;

  const stats = [
    { label: 'Total',     value: total,     color: 'text-gray-900',  bg: 'bg-white',    border: 'border-gray-200' },
    { label: 'Completed', value: completed, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    { label: 'Upcoming',  value: upcoming,  color: 'text-sky-700',   bg: 'bg-sky-50',   border: 'border-sky-200' },
    { label: 'Cancelled', value: cancelled, color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200' },
    { label: 'No Show',   value: noShow,    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}
        >
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Appointment Row ──────────────────────────────────────────────────────────

interface AppointmentRowProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
}
const AppointmentRow: React.FC<AppointmentRowProps> = ({ appointment, onClick }) => {
  const statusConfig =
    APPOINTMENT_STATUS_CONFIG[appointment.status] ||
    APPOINTMENT_STATUS_CONFIG['SCHEDULED'];

  return (
    <button
      onClick={() => onClick(appointment)}
      className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all group"
    >
      {/* Date block */}
      <div className="flex-shrink-0 w-11 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
          {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className="text-lg font-bold text-gray-900 leading-tight">
          {new Date(appointment.date).getDate()}
        </p>
        <p className="text-[10px] text-gray-400 leading-none">
          {new Date(appointment.date).getFullYear()}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-9 bg-gray-200 flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}
          </p>
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {appointment.start_time && (
            <>
              <Clock className="w-3 h-3 inline mr-1" />
              {appointment.start_time} – {appointment.end_time}
            </>
          )}
          {appointment.practitioner_name && (
            <> · {appointment.practitioner_name}</>
          )}
        </p>
        {appointment.cancellation_reason && (
          <p className="text-xs text-red-500 mt-0.5 truncate">
            Reason: {appointment.cancellation_reason}
          </p>
        )}
      </div>

      {/* Click hint */}
      <span className="flex-shrink-0 text-xs text-gray-300 group-hover:text-sky-500 transition-colors font-medium">
        View →
      </span>
    </button>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<
    'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  >('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDetailOpen, setIsAppointmentDetailOpen] = useState(false);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentDetailOpen(true);
  };

  const fetchPatient = useCallback(async () => {
    if (!id) return;
    setLoadingPatient(true);
    try {
      const data = await getPatient(Number(id));
      setPatient(data);
    } catch {
      toast.error('Failed to load patient details');
      navigate('/clients');
    } finally {
      setLoadingPatient(false);
    }
  }, [id, navigate]);

  const fetchAppointments = useCallback(async () => {
    if (!id) return;
    setLoadingAppointments(true);
    try {
      const data = await getAppointments({ patient: Number(id), page_size: 100 });
      const sorted = [...(data.results ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAppointments(sorted);
    } catch {
      toast.error('Failed to load appointment history');
    } finally {
      setLoadingAppointments(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
    fetchAppointments();
  }, [fetchPatient, fetchAppointments]);

  const handleSavePatient = async (data: CreatePatientData) => {
    if (!patient) return;
    try {
      await updatePatient(patient.id, data);
      toast.success('Client updated successfully');
      fetchPatient();
      setIsEditModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update client');
      throw error;
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const isUpcoming =
      ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status) &&
      new Date(a.date) >= new Date();
    if (appointmentFilter === 'UPCOMING')  return isUpcoming;
    if (appointmentFilter === 'COMPLETED') return a.status === 'COMPLETED';
    if (appointmentFilter === 'CANCELLED') return a.status === 'CANCELLED' || a.status === 'NO_SHOW';
    return true;
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loadingPatient) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading patient profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) return null;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden bg-gray-50">

        {/* ── Top Header bar (matches PatientList style) ── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate('/clients')}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Clients
              </button>
              <span className="text-gray-300">/</span>
              <span className="font-semibold text-gray-700">{patient.full_name}</span>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

            {/* ── Patient Hero Card ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Colored top strip */}
              <div className="h-2 bg-gradient-to-r from-sky-500 to-sky-600" />
              <div className="px-6 py-5">
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm">
                    {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-lg font-bold text-gray-900">{patient.full_name}</h1>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          patient.is_active
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {patient.is_active ? '● Active' : '● Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      ID:{' '}
                      <span className="font-mono font-medium text-gray-700">
                        {patient.patient_number}
                      </span>
                      <span className="mx-2 text-gray-300">·</span>
                      {getGenderLabel(patient.gender)}
                      <span className="mx-2 text-gray-300">·</span>
                      {patient.age} years old
                    </p>

                    {/* Contact chips */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {patient.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3 text-sky-500" />
                          {patient.phone}
                        </span>
                      )}
                      {patient.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3 text-sky-500" />
                          {patient.email}
                        </span>
                      )}
                      {patient.city && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 text-sky-500" />
                          {patient.city}, {patient.province}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 text-sky-500" />
                        Since {formatDate(patient.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Session Stats ── */}
            <PatientStats appointments={appointments} />

            {/* ── Main 2-column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* ── LEFT: Patient Details ── */}
              <div className="lg:col-span-1 space-y-3">

                <SectionCard title="Personal Information" icon={<User className="w-4 h-4" />}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoRow label="First Name"    value={patient.first_name} />
                    <InfoRow label="Last Name"     value={patient.last_name} />
                    {patient.middle_name && (
                      <InfoRow label="Middle Name" value={patient.middle_name} />
                    )}
                    <InfoRow label="Date of Birth" value={formatDate(patient.date_of_birth)} />
                    <InfoRow label="Age"           value={`${patient.age} yrs old`} />
                    <InfoRow label="Gender"        value={getGenderLabel(patient.gender)} />
                  </div>
                </SectionCard>

                <SectionCard title="Contact Information" icon={<MapPin className="w-4 h-4" />}>
                  <div className="space-y-3">
                    <InfoRow label="Phone"   value={patient.phone} />
                    <InfoRow label="Email"   value={patient.email} />
                    <InfoRow label="Address" value={patient.address} />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow label="City"     value={patient.city} />
                      <InfoRow label="Province" value={patient.province} />
                    </div>
                    <InfoRow label="Postal Code" value={patient.postal_code} />
                  </div>
                </SectionCard>

                <SectionCard title="Emergency Contact" icon={<Phone className="w-4 h-4" />}>
                  <div className="space-y-3">
                    <InfoRow label="Name"         value={patient.emergency_contact_name} />
                    <InfoRow label="Phone"        value={patient.emergency_contact_phone} />
                    <InfoRow label="Relationship" value={patient.emergency_contact_relationship} />
                  </div>
                </SectionCard>

                <SectionCard title="Medical Information" icon={<Heart className="w-4 h-4" />} defaultOpen={false}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 pb-3 border-b border-gray-100">
                      <InfoRow label="PhilHealth #" value={patient.philhealth_number} />
                      <InfoRow label="HMO Provider" value={patient.hmo_provider} />
                      <InfoRow label="HMO #"        value={patient.hmo_number} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Medical Conditions</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {patient.medical_conditions || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Allergies</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {patient.allergies || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Current Medications</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {patient.medications || '—'}
                      </p>
                    </div>
                  </div>
                </SectionCard>

              </div>

              {/* ── RIGHT: Appointment History ── */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

                  {/* Header */}
                  <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-600" />
                        <h2 className="text-sm font-semibold text-gray-700">
                          Appointment History
                        </h2>
                        <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                          {appointments.length} total
                        </span>
                      </div>

                      {/* Filter tabs */}
                      <div className="flex items-center gap-1">
                        {(['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setAppointmentFilter(f)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              appointmentFilter === f
                                ? 'bg-sky-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Click any appointment to view full details, clinical notes, and invoice
                    </p>
                  </div>

                  {/* List */}
                  <div className="p-4">
                    {loadingAppointments ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
                      </div>
                    ) : filteredAppointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                          <Calendar className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No appointments found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {appointmentFilter !== 'ALL'
                            ? `No ${appointmentFilter.toLowerCase()} appointments`
                            : 'This patient has no appointment history'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredAppointments.map((appointment) => (
                          <AppointmentRow
                            key={appointment.id}
                            appointment={appointment}
                            onClick={handleAppointmentClick}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* ── Footer timestamps ── */}
            <div className="flex items-center justify-between text-xs text-gray-400 pb-4 border-t border-gray-200 pt-3">
              <span>Created: {formatDateTime(patient.created_at)}</span>
              <span>Last Updated: {formatDateTime(patient.updated_at)}</span>
            </div>

          </div>
        </div>
      </div>

      {/* Edit Patient Modal */}
      <PatientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSavePatient}
        patient={patient}
        mode="edit"
      />

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        isOpen={isAppointmentDetailOpen}
        onClose={() => {
          setIsAppointmentDetailOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
      />
    </DashboardLayout>
  );
};