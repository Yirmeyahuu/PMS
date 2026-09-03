import React, { useState } from 'react';
import {
  Mail,
  MessageSquare,
  Building2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Check,
  ShieldAlert,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { updateClinicBranch } from '@/features/clinics/clinic.api';
import type { ClinicBranch } from '@/types/clinic';
import { usePermissions } from '@/hooks/usePermissions';

export const EmailReminder: React.FC = () => {
  const { branches, loading, error, refetch } = useClinicBranches();
  const { isOwner, isManager, canEdit } = usePermissions();

  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [savingBranchId, setSavingBranchId] = useState<number | null>(null);
  const [localBranchOverrides, setLocalBranchOverrides] = useState<
    Record<number, { email_notifications_enabled?: boolean }>
  >({});

  // Check if current user has permission to edit communication settings
  const hasEditPermission =
    isOwner ||
    isManager ||
    canEdit('manage_communications') ||
    canEdit('setup_communication') ||
    canEdit('communication');

  // Merge branches with local optimistic state
  const effectiveBranches = branches.map((branch) => {
    const override = localBranchOverrides[branch.id];
    if (!override) return branch;
    return {
      ...branch,
      ...override,
    };
  });

  const selectedBranch = effectiveBranches.find((b) => b.id === selectedBranchId) || null;

  // Format branch address
  const formatAddress = (branch: ClinicBranch): string => {
    const parts = [branch.address, branch.city, branch.province].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (branch.custom_location) return branch.custom_location;
    return 'No physical address specified';
  };

  // Handle toggling email notifications
  const handleToggleEmail = async (branch: ClinicBranch) => {
    if (!hasEditPermission) {
      toast.error('You do not have permission to modify communication settings.');
      return;
    }

    if (savingBranchId === branch.id) return;

    const currentVal = branch.email_notifications_enabled !== false;
    const nextVal = !currentVal;

    // Optimistic UI update
    setLocalBranchOverrides((prev) => ({
      ...prev,
      [branch.id]: {
        ...prev[branch.id],
        email_notifications_enabled: nextVal,
      },
    }));
    setSavingBranchId(branch.id);

    try {
      await updateClinicBranch(branch.id, {
        email_notifications_enabled: nextVal,
      });
      toast.success('Communication settings updated.');
      await refetch();
    } catch (err: any) {
      // Revert optimistic update on failure
      setLocalBranchOverrides((prev) => ({
        ...prev,
        [branch.id]: {
          ...prev[branch.id],
          email_notifications_enabled: currentVal,
        },
      }));
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Unable to update communication settings. Please try again.';
      toast.error(errorMsg);
    } finally {
      setSavingBranchId(null);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && branches.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-100 flex items-center justify-center animate-pulse">
            <Building2 className="w-6 h-6 text-sky-600" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-56 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-80 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-4 animate-pulse"
            >
              <div className="h-5 w-40 bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <div className="h-6 w-24 bg-slate-100 rounded-lg" />
                <div className="h-6 w-24 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-slate-400 pt-4">
          Loading clinic branches…
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && branches.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h3 className="text-sm font-bold text-rose-900">
              Unable to load communication settings
            </h3>
            <p className="text-xs text-rose-700">
              {error || 'Failed to retrieve clinic branch data. Please try again.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Communication Channels
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage communication channels for each clinic branch.
            </p>
          </div>
        </div>

        {selectedBranch && (
          <button
            type="button"
            onClick={() => setSelectedBranchId(null)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>View All Branches</span>
          </button>
        )}
      </div>

      {/* ── Main Layout: Single View vs Two-Column Layout ── */}
      <div className="transition-all duration-300">
        {!selectedBranch ? (
          /* ═════════════════════════════════════════════════════════════════════
             PART 1 — INITIAL STATE: FULL-WIDTH BRANCH LIST
             ═════════════════════════════════════════════════════════════════════ */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select a clinic branch to manage its communication channels ({branches.length})
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {effectiveBranches.map((branch) => {
                const isEmailEnabled = branch.email_notifications_enabled !== false;

                return (
                  <div
                    key={branch.id}
                    onClick={() => setSelectedBranchId(branch.id)}
                    className="group relative bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-sky-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Branch Title & Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                            {branch.name}
                          </h3>
                          {branch.is_main_branch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200/70">
                              <Building2 className="w-3 h-3" />
                              Main Branch
                            </span>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-sky-100 text-slate-400 group-hover:text-sky-600 flex items-center justify-center transition-colors shrink-0">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Address */}
                      <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5 line-clamp-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{formatAddress(branch)}</span>
                      </p>
                    </div>

                    {/* Status Badges */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                      {/* Email Status */}
                      {isEmailEnabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Email enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          Email disabled
                        </span>
                      )}

                      {/* SMS Status */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        SMS coming soon
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════════════
             PART 2 & 3 — TWO-COLUMN LAYOUT (SELECTED BRANCH)
             30% Branch List | 70% Settings Panel
             ═════════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* ── Left Column: Compressed Branch List (30% on desktop) ── */}
            <div className="w-full lg:w-80 lg:shrink-0 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Clinic Branches ({branches.length})
                </span>
                <span className="text-[11px] text-slate-400">Click to switch</span>
              </div>

              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {effectiveBranches.map((branch) => {
                  const isSelected = branch.id === selectedBranch.id;
                  const isEmailEnabled = branch.email_notifications_enabled !== false;

                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => setSelectedBranchId(branch.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 relative ${
                        isSelected
                          ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-400/30 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-bold truncate ${
                                isSelected ? 'text-sky-950' : 'text-slate-800'
                              }`}
                            >
                              {branch.name}
                            </span>
                            {branch.is_main_branch && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-700 shrink-0">
                                Main
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {formatAddress(branch)}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Mini channel tags */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            isEmailEnabled
                              ? 'bg-emerald-100/70 text-emerald-800'
                              : 'bg-slate-200/70 text-slate-600'
                          }`}
                        >
                          Email: {isEmailEnabled ? 'ON' : 'OFF'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-800">
                          SMS: Soon
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Right Column: Branch Settings Panel (70% on desktop) ── */}
            <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Settings Header */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                    Communication Channels
                  </span>
                  {selectedBranch.is_main_branch && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                      Main Branch
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  {selectedBranch.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {formatAddress(selectedBranch)}
                  {selectedBranch.branch_code && (
                    <span className="text-slate-400">· Code: {selectedBranch.branch_code}</span>
                  )}
                </p>
              </div>

              {/* RBAC Warning if user cannot edit */}
              {!hasEditPermission && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    You have view-only access. Only Administrators and Managers can toggle communication channels.
                  </span>
                </div>
              )}

              {/* ── Channels List ── */}
              <div className="space-y-4">
                {/* ── Channel 1: Email ── */}
                <div className="rounded-2xl border border-slate-200/90 p-5 sm:p-6 bg-white hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">Email</h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              selectedBranch.email_notifications_enabled !== false
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {selectedBranch.email_notifications_enabled !== false
                              ? 'Enabled'
                              : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                          Send appointment reminders, confirmations, and notifications to patients/clients.
                        </p>
                      </div>
                    </div>

                    {/* Functional Toggle Button */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {savingBranchId === selectedBranch.id && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Saving…
                        </span>
                      )}

                      <button
                        type="button"
                        role="switch"
                        aria-checked={selectedBranch.email_notifications_enabled !== false}
                        disabled={!hasEditPermission || savingBranchId === selectedBranch.id}
                        onClick={() => handleToggleEmail(selectedBranch)}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                          selectedBranch.email_notifications_enabled !== false
                            ? 'bg-emerald-500'
                            : 'bg-slate-300'
                        } ${
                          !hasEditPermission || savingBranchId === selectedBranch.id
                            ? 'opacity-60 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span className="sr-only">Toggle Email</span>
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-bold ${
                            selectedBranch.email_notifications_enabled !== false
                              ? 'translate-x-7 text-emerald-600'
                              : 'translate-x-0 text-slate-400'
                          }`}
                        >
                          {selectedBranch.email_notifications_enabled !== false ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Context Note when OFF */}
                  {selectedBranch.email_notifications_enabled === false && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/60 p-2.5 rounded-xl">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>
                        Automated and manual appointment emails are currently disabled for{' '}
                        <strong>{selectedBranch.name}</strong>. Other clinic branches continue to operate independently.
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Channel 2: SMS (Coming Soon) ── */}
                <div className="rounded-2xl border border-slate-200/70 p-5 sm:p-6 bg-slate-50/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">SMS</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                          SMS communication is currently in development.
                        </p>
                      </div>
                    </div>

                    {/* Non-interactive / Disabled Toggle */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] font-semibold text-slate-400">Disabled</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={false}
                        disabled={true}
                        className="relative inline-flex h-7 w-14 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 opacity-60 transition-colors"
                      >
                        <span className="sr-only">Toggle SMS (Coming Soon)</span>
                        <span
                          aria-hidden="true"
                          className="pointer-events-none inline-block h-6 w-6 transform translate-x-0 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-bold text-slate-400"
                        >
                          OFF
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      The system architecture is prepared for SMS. Gateway activation will be enabled in a future release.
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-2 text-xs text-slate-400 leading-relaxed">
                Settings apply exclusively to <strong>{selectedBranch.name}</strong>. Communication preferences for
                other branches remain completely independent.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
