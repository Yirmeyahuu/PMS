import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import {
  ArrowLeft, User, MapPin, Phone, Heart, Calendar, Edit,
  Clock, CheckCircle, XCircle, AlertCircle, FileText,
  Activity, Loader2, ChevronDown, ChevronUp, Mail,
  Archive, ArchiveRestore, Plus, FileCheck, Stethoscope,
} from 'lucide-react';
import { getPatient, updatePatient, archivePatient, restorePatient } from './patient.api';
import { getAppointments } from '@/features/appointments/appointment.api';
import { getNotes, emailNote, getPrintNote } from '@/features/clinical-template/clinical-templates.api';
import type { Patient, Appointment, CreatePatientData } from '@/types';
import type { ClinicalNote } from '@/types/clinicalTemplate';
import { PatientModal } from './components/PatientModal';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { CreateClinicalNoteModal } from '@/features/clinical-template/components/CreateClinicalNoteModal';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const getGenderLabel = (gender: string) => ({ M: 'Male', F: 'Female', O: 'Other' }[gender] ?? gender);

const APPOINTMENT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED:   { label: 'Scheduled',   color: 'bg-blue-50 text-blue-700',   icon: <Clock className="w-3 h-3" /> },
  CONFIRMED:   { label: 'Confirmed',   color: 'bg-sky-50 text-sky-700',     icon: <CheckCircle className="w-3 h-3" /> },
  CHECKED_IN:  { label: 'Checked In',  color: 'bg-purple-50 text-purple-700', icon: <Activity className="w-3 h-3" /> },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-50 text-yellow-700', icon: <Activity className="w-3 h-3" /> },
  COMPLETED:   { label: 'Completed',   color: 'bg-green-50 text-green-700',  icon: <CheckCircle className="w-3 h-3" /> },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-50 text-red-700',     icon: <XCircle className="w-3 h-3" /> },
  NO_SHOW:     { label: 'No Show',     color: 'bg-gray-100 text-gray-600',  icon: <AlertCircle className="w-3 h-3" /> },
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Initial Consultation', FOLLOW_UP: 'Follow-up',
  THERAPY: 'Therapy Session',      ASSESSMENT: 'Assessment',
};

// ─── InfoRow ──────────────────────────────────────────────────────────────────
interface InfoRowProps { label: string; value: string | React.ReactNode; }
const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
  </div>
);

// ─── SectionCard ─────────────────────────────────────────────────────────────
interface SectionCardProps { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; }
const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children, defaultOpen = true }) => {
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
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────
interface PatientStatsProps { appointments: Appointment[]; }
const PatientStats: React.FC<PatientStatsProps> = ({ appointments }) => {
  const total     = appointments.length;
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
  const upcoming  = appointments.filter((a) => ['SCHEDULED', 'CONFIRMED'].includes(a.status) && new Date(a.date) >= new Date()).length;
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
        <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Appointment Row ──────────────────────────────────────────────────────────
interface AppointmentRowProps { appointment: Appointment; onClick: (a: Appointment) => void; }
const AppointmentRow: React.FC<AppointmentRowProps> = ({ appointment, onClick }) => {
  const statusConfig = APPOINTMENT_STATUS_CONFIG[appointment.status] || APPOINTMENT_STATUS_CONFIG['SCHEDULED'];
  return (
    <button
      onClick={() => onClick(appointment)}
      className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all group"
    >
      <div className="flex-shrink-0 w-11 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
          {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{new Date(appointment.date).getDate()}</p>
        <p className="text-[10px] text-gray-400 leading-none">{new Date(appointment.date).getFullYear()}</p>
      </div>
      <div className="w-px h-9 bg-gray-200 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}
          </p>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
            {statusConfig.icon}{statusConfig.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {appointment.start_time && (
            <><Clock className="w-3 h-3 inline mr-1" />{appointment.start_time} – {appointment.end_time}</>
          )}
          {appointment.practitioner_name && <> · {appointment.practitioner_name}</>}
        </p>
        {appointment.cancellation_reason && (
          <p className="text-xs text-red-500 mt-0.5 truncate">Reason: {appointment.cancellation_reason}</p>
        )}
      </div>
      <span className="flex-shrink-0 text-xs text-gray-300 group-hover:text-sky-500 transition-colors font-medium">View →</span>
    </button>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const PatientProfile: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient,                 setPatient]                 = useState<Patient | null>(null);
  const [appointments,            setAppointments]            = useState<Appointment[]>([]);
  const [loadingPatient,          setLoadingPatient]          = useState(true);
  const [loadingAppointments,     setLoadingAppointments]     = useState(true);
  const [isEditModalOpen,         setIsEditModalOpen]         = useState(false);
  const [appointmentFilter,       setAppointmentFilter]       = useState<'ALL'|'UPCOMING'|'COMPLETED'|'CANCELLED'>('ALL');
  const [selectedAppointment,     setSelectedAppointment]     = useState<Appointment | null>(null);
  const [isAppointmentDetailOpen, setIsAppointmentDetailOpen] = useState(false);

  // ── Create Clinical Note modal state ─────────────────────────────────────────
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);

  // ── Tab state (History / Documents) ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'history' | 'documents'>('history');
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [emailingNoteId, setEmailingNoteId] = useState<number | null>(null);
  const [printingNoteId, setPrintingNoteId] = useState<number | null>(null);

  // ── Archive state ──────────────────────────────────────────────────────────
  const [showArchiveConfirm,  setShowArchiveConfirm]  = useState(false);
  const [showRestoreConfirm,  setShowRestoreConfirm]  = useState(false);
  const [archiveLoading,      setArchiveLoading]      = useState(false);

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

  const fetchClinicalNotes = useCallback(async () => {
    if (!id) return;
    setLoadingNotes(true);
    try {
      const data = await getNotes({ patient: Number(id) });
      setClinicalNotes(data);
    } catch {
      toast.error('Failed to load clinical notes');
    } finally {
      setLoadingNotes(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
    fetchAppointments();
    fetchClinicalNotes();
  }, [fetchPatient, fetchAppointments, fetchClinicalNotes]);

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

  const handleArchive = async () => {
    if (!patient) return;
    setArchiveLoading(true);
    try {
      await archivePatient(patient.id);
      toast.success(`${patient.full_name} has been archived.`);
      setShowArchiveConfirm(false);
      fetchPatient();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to archive patient');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!patient) return;
    setArchiveLoading(true);
    try {
      await restorePatient(patient.id);
      toast.success(`${patient.full_name} has been restored.`);
      setShowRestoreConfirm(false);
      fetchPatient();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to restore patient');
    } finally {
      setArchiveLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const isUpcoming = ['SCHEDULED','CONFIRMED','CHECKED_IN','IN_PROGRESS'].includes(a.status) && new Date(a.date) >= new Date();
    if (appointmentFilter === 'UPCOMING')  return isUpcoming;
    if (appointmentFilter === 'COMPLETED') return a.status === 'COMPLETED';
    if (appointmentFilter === 'CANCELLED') return a.status === 'CANCELLED' || a.status === 'NO_SHOW';
    return true;
  });

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

        {/* ── Top Header ── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
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
              {patient.is_archived && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                  <Archive className="w-3 h-3" />
                  Archived
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Archive / Restore button */}
              {patient.is_archived ? (
                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
                >
                  <ArchiveRestore className="w-4 h-4" />
                  Restore Client
                </button>
              ) : (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Archive Client
                </button>
              )}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* ── Archived banner ── */}
        {patient.is_archived && (
          <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              This client is <strong>archived</strong>. Their appointments are hidden from the diary.
              {patient.archived_by_name && ` Archived by ${patient.archived_by_name}.`}
              {patient.archived_at && ` on ${formatDate(patient.archived_at)}.`}
            </p>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

            {/* ── Patient Hero Card ── */}
            <div className={`bg-white rounded-xl border overflow-hidden ${patient.is_archived ? 'border-amber-200' : 'border-gray-200'}`}>
              <div className={`h-2 bg-gradient-to-r ${patient.is_archived ? 'from-amber-400 to-amber-500' : 'from-sky-500 to-sky-600'}`} />
              <div className="px-6 py-5">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm bg-gradient-to-br ${
                    patient.is_archived ? 'from-amber-400 to-amber-500' : 'from-sky-500 to-sky-600'
                  }`}>
                    {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-lg font-bold text-gray-900">{patient.full_name}</h1>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        patient.is_active
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {patient.is_active ? '● Active' : '● Inactive'}
                      </span>
                      {patient.is_archived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Archive className="w-3 h-3" />
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      ID: <span className="font-mono font-medium text-gray-700">{patient.patient_number}</span>
                      <span className="mx-2 text-gray-300">·</span>
                      {getGenderLabel(patient.gender)}
                      <span className="mx-2 text-gray-300">·</span>
                      {patient.age} years old
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {patient.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3 text-sky-500" />{patient.phone}
                        </span>
                      )}
                      {patient.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3 text-sky-500" />{patient.email}
                        </span>
                      )}
                      {patient.city && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 text-sky-500" />{patient.city}, {patient.province}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 text-sky-500" />Since {formatDate(patient.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Session Stats ── */}
            <PatientStats appointments={appointments} />

            {/* ── Main 2-col layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* LEFT: Patient Details */}
              <div className="lg:col-span-1 space-y-3">
                <SectionCard title="Personal Information" icon={<User className="w-4 h-4" />}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoRow label="First Name"    value={patient.first_name} />
                    <InfoRow label="Last Name"     value={patient.last_name} />
                    {patient.middle_name && <InfoRow label="Middle Name" value={patient.middle_name} />}
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
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{patient.medical_conditions || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Allergies</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{patient.allergies || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Current Medications</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{patient.medications || '—'}</p>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* RIGHT: Tabs (History / Documents) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Tab Header */}
                  <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setActiveTab('history')}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === 'history'
                              ? 'bg-sky-100 text-sky-700 border border-sky-200'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          History
                          <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                            {appointments.length}
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveTab('documents')}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === 'documents'
                              ? 'bg-sky-100 text-sky-700 border border-sky-200'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          Documents
                          <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                            {clinicalNotes.length}
                          </span>
                        </button>
                      </div>
                      {activeTab === 'documents' && (
                        <button
                          onClick={() => setIsCreateNoteOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create Note
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {activeTab === 'history' ? (
                      // History Tab - Appointments
                      loadingAppointments ? (
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
                        <>
                          {/* Filters for History */}
                          <div className="flex items-center gap-1 mb-4">
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
                          <div className="space-y-2">
                            {filteredAppointments.map((appointment) => (
                              <AppointmentRow key={appointment.id} appointment={appointment} onClick={handleAppointmentClick} />
                            ))}
                          </div>
                        </>
                      )
                    ) : (
                      // Documents Tab - Clinical Notes
                      loadingNotes ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
                        </div>
                      ) : clinicalNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-center">
                          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                            <FileText className="w-7 h-7 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">No clinical notes found</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click "Create Note" to add a clinical note for this patient
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clinicalNotes.map((note) => (
                            <div
                              key={note.id}
                              className="p-4 border border-gray-200 rounded-lg hover:border-sky-300 hover:bg-sky-50/40 transition-all"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {note.template_name || 'Clinical Note'}
                                  </span>
                                  {note.is_signed ? (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                                      <CheckCircle className="w-3 h-3" /> Signed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                      Draft
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDate(note.date)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {note.date}
                                  </span>
                                  {note.practitioner_name && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {note.practitioner_name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setEmailingNoteId(note.id);
                                      try {
                                        await emailNote(note.id);
                                        toast.success('Clinical note sent to patient email');
                                      } catch (error: any) {
                                        toast.error(error.response?.data?.detail || 'Failed to send email');
                                      } finally {
                                        setEmailingNoteId(null);
                                      }
                                    }}
                                    disabled={emailingNoteId === note.id}
                                    className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors disabled:opacity-50"
                                    title="Send to Client Email"
                                  >
                                    {emailingNoteId === note.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Mail className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setPrintingNoteId(note.id);
                                      try {
                                        const printData = await getPrintNote(note.id);
                                        const printContent = `
                                          <!DOCTYPE html>
                                          <html>
                                          <head>
                                            <title>Clinical Note - ${printData.patient_name}</title>
                                            <style>
                                              body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                                              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
                                              .clinic { font-size: 18px; font-weight: bold; color: #1e40af; }
                                              h1 { font-size: 24px; color: #333; margin: 10px 0; }
                                              .info { margin-bottom: 20px; }
                                              .info p { margin: 5px 0; }
                                              .section { margin-bottom: 20px; }
                                              .section h3 { background: #f3f4f6; padding: 10px; margin-bottom: 10px; border-left: 4px solid #1e40af; }
                                              .field { margin-bottom: 10px; }
                                              .field label { font-weight: bold; color: #666; }
                                              .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
                                              @media print { body { padding: 0; } }
                                            </style>
                                          </head>
                                          <body>
                                            <div class="header">
                                              <div class="clinic">${printData.clinic_name}</div>
                                              <h1>Clinical Note</h1>
                                            </div>
                                            <div class="info">
                                              <p><strong>Patient:</strong> ${printData.patient_name}</p>
                                              <p><strong>Patient ID:</strong> ${printData.patient_number}</p>
                                              <p><strong>Date:</strong> ${printData.date ? new Date(printData.date).toLocaleDateString() : 'N/A'}</p>
                                              <p><strong>Practitioner:</strong> ${printData.practitioner_name}${printData.practitioner_title ? ` (${printData.practitioner_title})` : ''}</p>
                                              <p><strong>Template:</strong> ${printData.template_name}</p>
                                              ${printData.is_signed ? `<p><strong>Signed:</strong> ${printData.signed_at ? new Date(printData.signed_at).toLocaleString() : 'Yes'}</p>` : ''}
                                            </div>
                                            ${printData.sections.map(section => `
                                              <div class="section">
                                                <h3>${section.title}</h3>
                                                ${section.fields.map(field => `
                                                  <div class="field">
                                                    <label>${field.label}:</label> ${field.value}
                                                  </div>
                                                `).join('')}
                                              </div>
                                            `).join('')}
                                            <div class="footer">
                                              <p>Generated on ${new Date().toLocaleString()}</p>
                                            </div>
                                          </body>
                                          </html>
                                        `;
                                        const printWindow = window.open('', '_blank');
                                        if (printWindow) {
                                          printWindow.document.write(printContent);
                                          printWindow.document.close();
                                          printWindow.print();
                                        }
                                      } catch (error: any) {
                                        toast.error(error.response?.data?.detail || 'Failed to generate print view');
                                      } finally {
                                        setPrintingNoteId(null);
                                      }
                                    }}
                                    disabled={printingNoteId === note.id}
                                    className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors disabled:opacity-50"
                                    title="Print Clinical Note"
                                  >
                                    {printingNoteId === note.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer timestamps */}
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
        onClose={() => { setIsAppointmentDetailOpen(false); setSelectedAppointment(null); }}
        appointment={selectedAppointment}
      />

      {/* Create Clinical Note Modal */}
      {patient && (
        <CreateClinicalNoteModal
          isOpen={isCreateNoteOpen}
          onClose={() => setIsCreateNoteOpen(false)}
          patientId={patient.id}
          patientName={patient.full_name}
          onSuccess={() => {
            // Refresh data if needed - the note will appear in appointment detail
            fetchClinicalNotes();
          }}
        />
      )}

      {/* Archive Confirm */}
      {showArchiveConfirm && (
        <ConfirmDialog
          title="Archive Client"
          message={`Archive ${patient.full_name}? Their appointments will be hidden from the diary until restored.`}
          confirmLabel={archiveLoading ? 'Archiving...' : 'Archive'}
          confirmDisabled={archiveLoading}
          confirmClassName="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
          icon={<Archive className="w-6 h-6 text-amber-600" />}
          iconBg="bg-amber-100"
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}

      {/* Restore Confirm */}
      {showRestoreConfirm && (
        <ConfirmDialog
          title="Restore Client"
          message={`Restore ${patient.full_name}? They and their appointments will become visible again.`}
          confirmLabel={archiveLoading ? 'Restoring...' : 'Restore'}
          confirmDisabled={archiveLoading}
          confirmClassName="bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
          icon={<ArchiveRestore className="w-6 h-6 text-sky-600" />}
          iconBg="bg-sky-100"
          onConfirm={handleRestore}
          onCancel={() => setShowRestoreConfirm(false)}
        />
      )}
    </DashboardLayout>
  );
};

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title:            string;
  message:          string;
  confirmLabel:     string;
  confirmDisabled?: boolean;
  confirmClassName: string;
  icon:             React.ReactNode;
  iconBg:           string;
  onConfirm:        () => void;
  onCancel:         () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title, message, confirmLabel, confirmDisabled = false, confirmClassName, icon, iconBg, onConfirm, onCancel,
}) => (
  <>
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mx-auto mb-4`}>{icon}</div>
          <h3 className="text-base font-bold text-gray-900 text-center mb-2">{title}</h3>
          <p className="text-sm text-gray-600 text-center">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  </>
);