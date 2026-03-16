import React, { useState, useEffect } from 'react';
import {
  Save, X, AlertCircle, Stethoscope,
  FileText, RefreshCw, Info,
} from 'lucide-react';
import type { Appointment } from '@/types';
import type { AppointmentEditPayload } from '../appointment.api';

interface Practitioner {
  id:             number;
  name:           string;
  specialization: string | null;
}

interface AppointmentEditFormProps {
  appointment:  Appointment;
  practitioners: Practitioner[];
  loadingPractitioners: boolean;
  isSaving:     boolean;
  isDirty:      boolean;
  editError:    string | null;
  onSave:       (payload: AppointmentEditPayload) => void;
  onCancel:     () => void;
  onMarkDirty:  () => void;
}

export const AppointmentEditForm: React.FC<AppointmentEditFormProps> = ({
  appointment,
  practitioners,
  loadingPractitioners,
  isSaving,
  isDirty,
  editError,
  onSave,
  onCancel,
  onMarkDirty,
}) => {
  // ── Local form state — seeded from the appointment ────────────────────────
  const [practitioner,    setPractitioner]    = useState<number | ''>(
    appointment.practitioner ?? ''
  );
  const [chiefComplaint,  setChiefComplaint]  = useState(appointment.chief_complaint  || '');
  const [notes,           setNotes]           = useState(appointment.notes            || '');
  const [patientNotes,    setPatientNotes]    = useState(appointment.patient_notes    || '');

  // Re-seed if appointment prop changes (e.g. after a successful save)
  useEffect(() => {
    setPractitioner(appointment.practitioner ?? '');
    setChiefComplaint(appointment.chief_complaint  || '');
    setNotes(appointment.notes            || '');
    setPatientNotes(appointment.patient_notes    || '');
  }, [appointment]);

  // ── Helper: mark dirty on any change ─────────────────────────────────────
  const handleChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    onMarkDirty();
  };

  // ── Build payload and delegate to parent ──────────────────────────────────
  const handleSave = () => {
    const payload: AppointmentEditPayload = {
      practitioner:    practitioner === '' ? null : Number(practitioner),
      chief_complaint: chiefComplaint,
      notes:           notes,
      patient_notes:   patientNotes,
    };
    onSave(payload);
  };

  const inputBase =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ' +
    'bg-white transition-colors';

  return (
    <div className="space-y-4">

      {/* ── Edit mode banner ── */}
      <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-sky-500 flex-shrink-0" />
        <p className="text-xs text-sky-700 font-medium">
          You are editing this appointment. Only the fields below can be changed.
        </p>
      </div>

      {/* ── Error banner ── */}
      {editError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{editError}</p>
        </div>
      )}

      {/* ── 1. Assigned Practitioner ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-sky-500" />
            Assigned Practitioner
            <span className="text-xs font-normal text-gray-400">(Optional)</span>
          </span>
        </label>
        {loadingPractitioners ? (
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-400">Loading practitioners…</span>
          </div>
        ) : (
          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={practitioner}
              onChange={e => handleChange(
                setPractitioner,
                e.target.value === '' ? '' : Number(e.target.value)
              )}
              className={`${inputBase} pl-9`}
            >
              <option value="">Unassigned</option>
              {practitioners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.specialization ? ` — ${p.specialization}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── 2. Chief Complaint ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            Chief Complaint
          </span>
        </label>
        <textarea
          value={chiefComplaint}
          onChange={e => handleChange(setChiefComplaint, e.target.value)}
          rows={2}
          placeholder="Primary reason for visit…"
          className={`${inputBase} resize-none`}
        />
      </div>

      {/* ── 3. Internal Notes ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Internal Notes
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-normal">
              Staff Only
            </span>
          </span>
        </label>
        <textarea
          value={notes}
          onChange={e => handleChange(setNotes, e.target.value)}
          rows={3}
          placeholder="Internal notes visible to staff only…"
          className={`${inputBase} resize-none border-amber-200 focus:ring-amber-400`}
        />
      </div>

      {/* ── 4. Patient Notes ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            Patient Notes
            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full font-normal">
              Visible to Patient
            </span>
          </span>
        </label>
        <textarea
          value={patientNotes}
          onChange={e => handleChange(setPatientNotes, e.target.value)}
          rows={3}
          placeholder="Notes that will be visible to the patient…"
          className={`${inputBase} resize-none`}
        />
      </div>

      {/* ── Dirty indicator ── */}
      {isDirty && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Unsaved changes
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};