import React, { useEffect, useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { getPractitioners } from '@/features/clinics/clinic.api';
import type { Practitioner } from '@/features/clinics/clinic.api';
import type { ClinicService, ClinicServicePayload } from '../../../services/clinic-services.api';

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
  assigned_practitioners: [],
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

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  open,
  editing,
  onClose,
  onSubmit,
}) => {
  const [form,         setForm]         = useState<ClinicServicePayload>(EMPTY);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState<Partial<Record<keyof ClinicServicePayload, string>>>({});
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);

  // Load practitioners once on open
  useEffect(() => {
    if (!open) return;
    getPractitioners().then(r => setPractitioners(
      r.practitioners.filter(p => typeof p.id === 'number') as Practitioner[]
    )).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (editing) {
      setForm({
        name:             editing.name,
        description:      editing.description,
        duration_minutes: editing.duration_minutes,
        price:            editing.price,
        color_hex:        editing.color_hex,
        is_active:        editing.is_active,
        show_in_portal:   editing.show_in_portal,
        assigned_practitioners: editing.assigned_practitioners ?? [],
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [editing, open]);

  const set = <K extends keyof ClinicServicePayload>(k: K, v: ClinicServicePayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const togglePractitioner = (id: number) => {
    const current = form.assigned_practitioners ?? [];
    set('assigned_practitioners', current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim())          e.name             = 'Name is required.';
    if (form.duration_minutes <= 0) e.duration_minutes = 'Duration must be > 0.';
    if (parseFloat(form.price) < 0) e.price            = 'Price cannot be negative.';
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.color_hex)) e.color_hex = 'Invalid hex color.';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Initial Consultation"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              placeholder="Brief description of this service..."
            />
          </div>

          {/* Duration + Price row */}
          <div className="grid grid-cols-2 gap-4">

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Duration <span className="text-red-500">*</span>
              </label>
              <select
                value={form.duration_minutes}
                onChange={(e) => set('duration_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.duration_minutes && (
                <p className="text-xs text-red-500 mt-1">{errors.duration_minutes}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Price (₱) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
          </div>

          {/* Color — full width now that sort order is removed */}
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
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="#0D9488"
              />
            </div>
            {errors.color_hex && <p className="text-xs text-red-500 mt-1">{errors.color_hex}</p>}
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            {(
              [
                { key: 'is_active',      label: 'Active',         sub: 'Enable this service for use.' },
                { key: 'show_in_portal', label: 'Show in Portal', sub: 'Patients can book this online.' },
              ] as const
            ).map(({ key, label, sub }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <div
                  onClick={() => set(key, !form[key])}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    form[key] ? 'bg-teal-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form[key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>

          {/* Assigned Practitioners */}
          {practitioners.length > 0 && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Assigned Practitioners
                <span className="ml-1 font-normal text-gray-400">(leave blank to allow any)</span>
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2.5">
                {practitioners.map((p) => {
                  const checked = (form.assigned_practitioners ?? []).includes(p.id as number);
                  return (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePractitioner(p.id as number)}
                        className="w-4 h-4 rounded accent-teal-600"
                      />
                      <span className="text-sm text-gray-700">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
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