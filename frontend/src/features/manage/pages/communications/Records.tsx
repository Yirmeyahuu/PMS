import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail,
  MessageSquare,
  Building2,
  Users,
  ChevronRight,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Check,
  Phone,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { getPatients, updatePatient } from '@/features/patients/patient.api';
import {
  communicationRecordsApi,
  type CommunicationLog,
  type CommChannel,
  type CommStatus,
} from '../../services/communications.api';
import { CommunicationDetailModal } from './CommunicationDetailModal';
import { usePermissions } from '@/hooks/usePermissions';
import type { ClinicBranch } from '@/types/clinic';
import type { Patient } from '@/types/patient';

// ── Status Badge helper ───────────────────────────────────────────────────────

const STATUS_CFG: Record<CommStatus, { label: string; className: string }> = {
  QUEUED:    { label: 'Queued',    className: 'bg-slate-100 text-slate-700 border-slate-200' },
  SENT:      { label: 'Sent',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OPENED:    { label: 'Opened',    className: 'bg-teal-50 text-teal-700 border-teal-200' },
  REPLIED:   { label: 'Replied',   className: 'bg-violet-50 text-violet-700 border-violet-200' },
  FAILED:    { label: 'Failed',    className: 'bg-rose-50 text-rose-700 border-rose-200' },
  BOUNCED:   { label: 'Bounced',   className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING:   { label: 'Pending',   className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

export const Records: React.FC = () => {
  const { branches, loading: branchesLoading, error: branchesError, refetch: refetchBranches } = useClinicBranches();
  const { isOwner, isManager, canEdit } = usePermissions();

  const hasEditPermission =
    isOwner ||
    isManager ||
    canEdit('manage_communications') ||
    canEdit('setup_communication') ||
    canEdit('communication');

  // ── Hierarchy State ──────────────────────────────────────────────────────────
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // ── Patients State ───────────────────────────────────────────────────────────
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const patientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Communications State ─────────────────────────────────────────────────────
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState<CommChannel | 'ALL'>('ALL');
  const [selectedLog, setSelectedLog] = useState<CommunicationLog | null>(null);

  // ── Patient Preference Saving State ──────────────────────────────────────────
  const [savingPref, setSavingPref] = useState(false);

  // Auto-select primary/first branch when branches load if none selected
  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      const primary = branches.find((b) => b.is_main_branch) || branches[0];
      setSelectedBranchId(primary.id);
    }
  }, [branches, selectedBranchId]);

  // Current selections
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  // Format branch address
  const formatBranchAddress = (branch: ClinicBranch): string => {
    const parts = [branch.address, branch.city, branch.province].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (branch.custom_location) return branch.custom_location;
    return 'No physical address';
  };

  // ── Load Patients when branch changes ────────────────────────────────────────
  const fetchPatients = useCallback(
    async (branchId: number, search = '') => {
      setPatientsLoading(true);
      try {
        const res = await getPatients({
          branch: branchId,
          search: search.trim() || undefined,
          is_active: true,
          page_size: 100,
        });
        setPatients(res.results);
      } catch {
        toast.error('Unable to load patients for this branch.');
      } finally {
        setPatientsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedBranchId) {
      fetchPatients(selectedBranchId, patientSearch);
    } else {
      setPatients([]);
      setSelectedPatientId(null);
    }
  }, [selectedBranchId, fetchPatients]);

  // Debounced patient search
  const handleSearchChange = (value: string) => {
    setPatientSearch(value);
    if (!selectedBranchId) return;

    if (patientSearchTimer.current) clearTimeout(patientSearchTimer.current);
    patientSearchTimer.current = setTimeout(() => {
      fetchPatients(selectedBranchId, value);
    }, 300);
  };

  // ── Load Communications when patient changes ─────────────────────────────────
  const fetchLogs = useCallback(
    async (branchId: number, patientId: number, channel: CommChannel | 'ALL') => {
      setLogsLoading(true);
      try {
        const res = await communicationRecordsApi.list({
          branch: branchId,
          patient: patientId,
          channel: channel === 'ALL' ? undefined : channel,
          page_size: 50,
        });
        setLogs(res.results);
      } catch {
        toast.error('Unable to load communication history.');
      } finally {
        setLogsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedBranchId && selectedPatientId) {
      fetchLogs(selectedBranchId, selectedPatientId, channelFilter);
    } else {
      setLogs([]);
    }
  }, [selectedBranchId, selectedPatientId, channelFilter, fetchLogs]);

  // ── Toggle Patient Email Preference ──────────────────────────────────────────
  const handleTogglePatientEmail = async () => {
    if (!selectedPatient) return;
    if (!hasEditPermission) {
      toast.error('You do not have permission to modify patient communication settings.');
      return;
    }

    const currentVal = selectedPatient.send_email_notifications ?? true;
    const nextVal = !currentVal;

    // Optimistic UI update
    setPatients((prev) =>
      prev.map((p) => (p.id === selectedPatient.id ? { ...p, send_email_notifications: nextVal } : p)),
    );
    setSavingPref(true);

    try {
      await updatePatient(selectedPatient.id, {
        send_email_notifications: nextVal,
      });
      toast.success('Patient communication preferences updated.');
    } catch {
      // Revert on failure
      setPatients((prev) =>
        prev.map((p) => (p.id === selectedPatient.id ? { ...p, send_email_notifications: currentVal } : p)),
      );
      toast.error('Unable to update patient communication settings. Please try again.');
    } finally {
      setSavingPref(false);
    }
  };

  // ── Format Date ─────────────────────────────────────────────────────────────
  const formatDateTime = (isoString: string): string => {
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // ── Render: Error State ─────────────────────────────────────────────────────
  if (branchesError && branches.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <h3 className="text-xs font-bold text-rose-900">Unable to load clinic branches</h3>
            <p className="text-xs text-rose-700">{branchesError}</p>
            <button
              type="button"
              onClick={() => refetchBranches()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-white overflow-hidden">
      {/* ── Compact Header ── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-tight truncate">
              Communication Records
            </h1>
            <p className="text-[11px] text-gray-500 leading-none mt-0.5 truncate hidden sm:block">
              Audit-ready history of all patient communications scoped by clinic branch
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (selectedBranchId && selectedPatientId) {
                fetchLogs(selectedBranchId, selectedPatientId, channelFilter);
              } else if (selectedBranchId) {
                fetchPatients(selectedBranchId, patientSearch);
              } else {
                refetchBranches();
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Three Connected Columns Workspace (Full Viewport Height) ── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* ═════════════════════════════════════════════════════════════════════
           COLUMN 1: CLINIC BRANCHES
           ═════════════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full md:w-60 lg:w-64 xl:w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-0 ${
            selectedBranchId && selectedPatientId
              ? 'hidden md:flex'
              : selectedBranchId
              ? 'hidden md:flex'
              : 'flex'
          }`}
        >
          {/* Column Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Clinic Branches
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
              {branches.length}
            </span>
          </div>

          {/* Branches List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {branchesLoading && branches.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-1 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                <span className="text-xs">Loading branches…</span>
              </div>
            ) : (
              branches.map((branch) => {
                const isSelected = branch.id === selectedBranch?.id;
                const patientCount = branch.patient_count ?? 0;

                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      setSelectedBranchId(branch.id);
                      setSelectedPatientId(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-300 text-sky-950 shadow-xs'
                        : 'bg-white hover:bg-gray-50/80 border-gray-200/80 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold truncate">{branch.name}</span>
                          {branch.is_main_branch && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 shrink-0">
                              Main
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {formatBranchAddress(branch)}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {patientCount} pts
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          branch.email_notifications_enabled !== false
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Email: {branch.email_notifications_enabled !== false ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
           COLUMN 2: PATIENTS / CLIENTS (SCOPED TO SELECTED BRANCH)
           ═════════════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full md:w-64 lg:w-72 xl:w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-0 ${
            selectedBranchId && selectedPatientId
              ? 'hidden md:flex'
              : selectedBranchId
              ? 'flex'
              : 'hidden md:flex'
          }`}
        >
          {/* Column Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile back to branches button */}
              <button
                type="button"
                onClick={() => setSelectedBranchId(null)}
                className="md:hidden p-1 text-gray-500 hover:text-gray-700"
                title="Back to Branches"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Patients
                  </span>
                </div>
                {selectedBranch && (
                  <p className="text-[10px] text-gray-400 truncate leading-none mt-0.5">
                    {selectedBranch.name}
                  </p>
                )}
              </div>
            </div>

            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 shrink-0">
              {patients.length}
            </span>
          </div>

          {/* Compact Search Bar (Part 13) */}
          <div className="p-2 border-b border-gray-100 bg-white shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, ID, phone…"
                value={patientSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-sky-400 focus:border-transparent transition"
              />
              {patientSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Patients List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {!selectedBranch ? (
              <div className="py-12 px-4 text-center text-gray-400 text-xs">
                Select a clinic branch to view patients.
              </div>
            ) : patientsLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-1 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                <span className="text-xs">Loading patients…</span>
              </div>
            ) : patients.length === 0 ? (
              <div className="py-12 px-4 text-center text-gray-400 text-xs">
                {patientSearch ? 'No patients match your search.' : 'No patients found in this branch.'}
              </div>
            ) : (
              patients.map((patient) => {
                const isSelected = patient.id === selectedPatient?.id;
                const emailEnabled = patient.send_email_notifications ?? true;

                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-300 text-sky-950 shadow-xs'
                        : 'bg-white hover:bg-gray-50/80 border-gray-200/80 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold truncate block">
                          {patient.first_name} {patient.last_name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                          <span>{patient.patient_number || `ID: #${patient.id}`}</span>
                          {patient.phone && (
                            <span className="font-sans text-gray-400 truncate">
                              • {patient.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      {patient.email ? (
                        <span className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{patient.email}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">No email</span>
                      )}

                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                          emailEnabled
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Email: {emailEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
           COLUMN 3: COMMUNICATION HISTORY & PREFERENCES
           ═════════════════════════════════════════════════════════════════════ */}
        <div
          className={`flex-1 bg-white flex flex-col min-h-0 overflow-hidden ${
            selectedPatientId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!selectedPatient ? (
            /* Empty State: No patient selected */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Select a patient</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Choose a patient from the list to view their complete communication records and preferences.
              </p>
            </div>
          ) : (
            /* Selected Patient Workspace */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Compact Patient Header */}
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile back to patient list */}
                  <button
                    type="button"
                    onClick={() => setSelectedPatientId(null)}
                    className="md:hidden p-1 text-gray-500 hover:text-gray-700"
                    title="Back to Patients"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-gray-900 truncate">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h2>
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                        {selectedPatient.patient_number || `ID: #${selectedPatient.id}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                      {selectedPatient.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{selectedPatient.email}</span>
                        </span>
                      )}
                      {selectedPatient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{selectedPatient.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-gray-400 hidden lg:inline">
                    Branch: <strong>{selectedBranch?.name}</strong>
                  </span>
                </div>
              </div>

              {/* Compact Communication Preferences Bar (Parts 8, 9, 10, 11) */}
              <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between gap-4 flex-wrap shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Preferences:
                  </span>
                  {savingPref && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                      Saving…
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Email Toggle */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs">
                    <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="font-semibold text-gray-800">Email</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={selectedPatient.send_email_notifications !== false}
                      disabled={!hasEditPermission || savingPref}
                      onClick={handleTogglePatientEmail}
                      className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        selectedPatient.send_email_notifications !== false
                          ? 'bg-emerald-500'
                          : 'bg-gray-300'
                      } ${!hasEditPermission || savingPref ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          selectedPatient.send_email_notifications !== false
                            ? 'translate-x-4'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[10px] font-bold ${
                        selectedPatient.send_email_notifications !== false
                          ? 'text-emerald-700'
                          : 'text-gray-500'
                      }`}
                    >
                      {selectedPatient.send_email_notifications !== false ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* SMS Toggle (Coming Soon) */}
                  <div className="flex items-center gap-2 bg-gray-50/70 border border-gray-200/80 rounded-lg px-2.5 py-1 text-xs opacity-75">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold text-gray-700">SMS</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                      Coming Soon
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={false}
                      disabled={true}
                      className="relative inline-flex h-4 w-8 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-gray-300"
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none inline-block h-3 w-3 transform translate-x-0 rounded-full bg-white shadow ring-0"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Communication History Subheader & Channel Filter */}
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <span className="text-xs font-bold text-gray-700">
                  History ({logs.length})
                </span>

                {/* Channel Filter tabs */}
                <div className="flex items-center gap-1 bg-gray-200/70 p-0.5 rounded-lg text-xs">
                  {(['ALL', 'EMAIL', 'SMS'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannelFilter(ch)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                        channelFilter === ch
                          ? 'bg-white text-gray-900 shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {ch === 'ALL' ? 'All' : ch}
                      {ch === 'SMS' && (
                        <span className="ml-1 text-[8px] text-amber-600 font-bold">Soon</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Communication Records Feed */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {logsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-1.5 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                    <span className="text-xs">Loading communications…</span>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-1">
                    <MessageSquare className="w-6 h-6 mx-auto text-gray-300" />
                    <p className="text-xs font-semibold text-gray-700">No communication records</p>
                    <p className="text-[11px] text-gray-400">
                      This patient has not received any communications yet.
                    </p>
                  </div>
                ) : (
                  logs.map((log) => {
                    const statusCfg = STATUS_CFG[log.status] ?? STATUS_CFG.QUEUED;

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="p-3 bg-white hover:bg-gray-50/80 rounded-xl border border-gray-200 hover:border-sky-300 transition-all cursor-pointer space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                              {log.channel === 'EMAIL' ? (
                                <Mail className="w-3 h-3" />
                              ) : (
                                <MessageSquare className="w-3 h-3" />
                              )}
                              {log.channel_display || log.channel}
                            </span>
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {log.comm_type_display || log.comm_type}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${statusCfg.className}`}
                            >
                              {statusCfg.label}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Subject / Recipient */}
                        <div className="text-xs">
                          {log.subject && (
                            <p className="font-semibold text-gray-800 line-clamp-1">
                              {log.subject}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            To: <span className="text-gray-600 font-mono">{log.recipient}</span>
                          </p>
                        </div>

                        {/* Body preview */}
                        {log.body_preview && (
                          <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {log.body_preview}
                          </p>
                        )}

                        {/* Error message if failed */}
                        {log.error_message && (
                          <p className="text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{log.error_message}</span>
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal (reusing existing full-featured modal) ── */}
      {selectedLog && (
        <CommunicationDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onResend={() => {
            if (selectedBranchId && selectedPatientId) {
              fetchLogs(selectedBranchId, selectedPatientId, channelFilter);
            }
          }}
          onUpdated={() => {
            if (selectedBranchId && selectedPatientId) {
              fetchLogs(selectedBranchId, selectedPatientId, channelFilter);
            }
          }}
        />
      )}
    </div>
  );
};
