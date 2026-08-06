import React from 'react';
import { AlertTriangle, Calendar, Clock, StickyNote, X, Trash2, ShieldAlert } from 'lucide-react';
import type { PractitionerRoleImpact } from '../../types/staff.types';

// ── Types ────────────────────────────────────────────────────────────────────

interface PractitionerRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  impact: PractitionerRoleImpact;
  practitionerName: string;
}

// ── Impact Row Component ─────────────────────────────────────────────────────

const ImpactRow: React.FC<{
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}> = ({ icon: Icon, label, count, color }) => (
  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50/80 border border-gray-100">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
    <span className={`text-lg font-bold tabular-nums ${count > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
      {count}
    </span>
  </div>
);

// ── Main Modal ───────────────────────────────────────────────────────────────

export const PractitionerRemovalModal: React.FC<PractitionerRemovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  impact,
  practitionerName,
}) => {
  if (!isOpen) return null;

  const totalAffected =
    impact.future_appointments +
    impact.future_blockouts +
    impact.future_calendar_events;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Header ── */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-200/50">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900">
                Remove Practitioner Role
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Confirm data cleanup for{' '}
                <span className="font-semibold text-gray-700">{practitionerName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 -mt-1 -mr-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">This action will permanently delete future scheduling data.</p>
              <p className="text-amber-700">
                All future appointments, block-outs, and calendar events assigned to this
                practitioner will be <strong>permanently removed</strong>. This cannot be undone.
              </p>
            </div>
          </div>

          {/* Impact counts */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Data to be removed
            </p>
            <ImpactRow
              icon={Calendar}
              label="Future Appointments"
              count={impact.future_appointments}
              color="bg-rose-100 text-rose-600"
            />
            <ImpactRow
              icon={Clock}
              label="Future Block-Outs"
              count={impact.future_blockouts}
              color="bg-orange-100 text-orange-600"
            />
            <ImpactRow
              icon={StickyNote}
              label="Future Calendar Events"
              count={impact.future_calendar_events}
              color="bg-violet-100 text-violet-600"
            />
          </div>

          {/* Preservation notice */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-semibold text-emerald-800 mb-1">
              ✓ Historical records are preserved
            </p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              All past appointments, completed sessions, clinical notes, invoices,
              and patient documents will remain intact and accessible.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md text-sm font-semibold"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Removing…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Remove Role &amp; Delete {totalAffected} Record{totalAffected !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
