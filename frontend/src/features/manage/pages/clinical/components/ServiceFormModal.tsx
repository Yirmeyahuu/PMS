import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, AlertCircle, Stethoscope } from 'lucide-react';
import type { ClinicService, ClinicServicePayload, DisciplineChoice } from '../../../services/clinic-services.api';
import { clinicServicesApi } from '../../../services/clinic-services.api';

interface ServiceFormModalProps {
  open:      boolean;
  editing:   ClinicService | null;
  onClose:   () => void;
  onSubmit:  (payload: ClinicServicePayload) => Promise<void>;
}

const EMPTY: ClinicServicePayload = {
  name:             '',
  description:      '',
  duration_minutes: 30,
  price:            '0.00',
  color_hex:        '#0D9488',
  is_active:        true,
  show_in_portal:   true,
  is_package:       false,
  session_allocation: null,
  discipline:       '',
};

// ── Duration options in 15-min increments (15 min → 8 hours) ─────────────────
const DURATION_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: 32 },
  (_, i) => {
    const mins  = (i + 1) * 15;
    const hours = Math.floor(mins / 60);
    const rem   = mins % 60;

    let label = '';
    if (hours > 0 && rem > 0) label = `${hours}h ${rem}m`;
    else if (hours > 0)        label = `${hours}h`;
    else                       label = `${mins} mins`;

    return { value: mins, label };
  },
);

// ── Field helpers ─────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
const selectCls = `${inputCls} bg-white`;

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <p className="flex items-center gap-1 mt-1 text-xs text-rose-500">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {msg}
    </p>
  ) : null;

// ─────────────────────────────────────────────────────────────────────────────

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  open,
  editing,
  onClose,
  onSubmit,
}) => {
  const [form,        setForm]        = useState<ClinicServicePayload>(EMPTY);
  const [submitting,  setSubmitting]  = useState(false);
  const [errors,      setErrors]      = useState<Partial<Record<keyof ClinicServicePayload, string>>>({});
  const [disciplines, setDisciplines] = useState<DisciplineChoice[]>([]);
  const [loadingDisc, setLoadingDisc] = useState(false);

  // Load discipline choices once on open
  useEffect(() => {
    if (!open) return;
    setLoadingDisc(true);
    clinicServicesApi.getDisciplineChoices()
      .then(setDisciplines)
      .catch(() => {})
      .finally(() => setLoadingDisc(false));
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setForm({
        name:             editing.name,
        description:      editing.description,
        duration_minutes: editing.duration_minutes,
        price:            editing.price,
        color_hex:        editing.color_hex,
        is_active:        true,
        show_in_portal:   true,
        is_package:       editing.is_package ?? false,
        session_allocation: editing.session_allocation ?? null,
        discipline:       editing.discipline ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [editing, open]);

  const set = <K extends keyof ClinicServicePayload>(k: K, v: ClinicServicePayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim())          e.name             = 'Service name is required.';
    if (form.duration_minutes <= 0) e.duration_minutes = 'Duration must be > 0.';
    if (parseFloat(form.price) < 0) e.price            = 'Price cannot be negative.';
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.color_hex)) e.color_hex = 'Invalid hex color.';
    if (!form.discipline)           e.discipline       = 'Assigned Discipline is required.';
    
    if (form.is_package) {
      if (!form.session_allocation || form.session_allocation < 1) {
        e.session_allocation = 'Must allocate at least 1 session for a package.';
      }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {editing ? 'Edit Service' : 'Create Service'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* ── Service Name ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Service Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={`${inputCls} ${errors.name ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
              placeholder="e.g. Initial Consultation"
            />
            <FieldError msg={errors.name} />
          </div>

          {/* ── Description ──────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Brief description of this service..."
            />
          </div>

          {/* ── Duration + Price ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Duration <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.duration_minutes}
                onChange={(e) => set('duration_minutes', parseInt(e.target.value))}
                className={selectCls}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <FieldError msg={errors.duration_minutes} />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Price (₱) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className={`${inputCls} ${errors.price ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
              />
              <FieldError msg={errors.price} />
            </div>
          </div>

          {/* ── Calendar Colour ───────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Calendar Colour
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color_hex}
                onChange={(e) => set('color_hex', e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.color_hex}
                onChange={(e) => set('color_hex', e.target.value)}
                className={`flex-1 ${inputCls} font-mono ${errors.color_hex ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                placeholder="#0D9488"
              />
            </div>
            <FieldError msg={errors.color_hex} />
          </div>

          {/* ── Assigned Discipline ───────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-500" />
                Assigned Discipline <span className="text-rose-500">*</span>
              </span>
            </label>
            {loadingDisc ? (
              <div className={`${selectCls} text-gray-400 flex items-center gap-2`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading disciplines…
              </div>
            ) : (
              <select
                value={form.discipline}
                onChange={(e) => set('discipline', e.target.value)}
                className={`${selectCls} ${errors.discipline ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
              >
                <option value="" disabled>— Select a discipline —</option>
                {disciplines.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            )}
            <FieldError msg={errors.discipline} />
            {!errors.discipline && (
              <p className="mt-0.5 text-[10px] text-gray-400">
                All practitioners with this discipline can offer this service.
              </p>
            )}
          </div>

          {/* ── Package Support ────────────────────────────────────────────── */}
          <div className="pt-4 mt-2 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  id="is_package"
                  type="checkbox"
                  checked={form.is_package}
                  onChange={(e) => {
                    set('is_package', e.target.checked);
                    if (!e.target.checked) set('session_allocation', null);
                  }}
                  className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                />
              </div>
              <div className="text-sm">
                <label htmlFor="is_package" className="font-semibold text-gray-700">
                  Is Package?
                </label>
                <p className="text-xs text-gray-500">
                  If checked, this service will automatically allocate treatment sessions to a Case when booked.
                </p>
              </div>
            </div>

            {form.is_package && (
              <div className="mt-4 pl-7">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Session Allocation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.session_allocation ?? ''}
                  onChange={(e) => set('session_allocation', parseInt(e.target.value) || null)}
                  className={`${inputCls} w-1/2 ${errors.session_allocation ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  placeholder="e.g. 6"
                />
                <FieldError msg={errors.session_allocation} />
              </div>
            )}
          </div>

        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />
            }
            {editing ? 'Save Changes' : 'Create Service'}
          </button>
        </div>

      </div>
    </div>
  );
};