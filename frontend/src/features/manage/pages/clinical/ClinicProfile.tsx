import React, { useEffect, useState } from 'react';
import {
  Building2, Mail, Phone, MapPin, Globe, FileText,
  Clock, BadgeCheck, Edit2, Loader2, AlertCircle,
  CheckCircle2, ImageOff,
} from 'lucide-react';
import { getMyClinic, setupClinicProfile } from '@/features/clinics/clinic.api';
import type { ClinicProfile as ClinicProfileType, ClinicProfileSetupPayload } from '@/features/clinics/clinic.api';
import { PhLocationSelect } from '@/components/location/PhLocationSelect';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

// ── Read-only field ───────────────────────────────────────────────────────────
const InfoRow: React.FC<{
  icon:    React.ReactNode;
  label:   string;
  value:   string | null | undefined;
  mono?:   boolean;
}> = ({ icon, label, value, mono }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <span className="mt-0.5 flex-shrink-0 text-sky-500">{icon}</span>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 mt-0.5 break-words ${mono ? 'font-mono' : ''}`}>
        {value && value.trim() ? value : <span className="text-gray-300 italic">Not set</span>}
      </p>
    </div>
  </div>
);

// ── Editable input ────────────────────────────────────────────────────────────
const EditField: React.FC<{
  label:       string;
  name:        string;
  value:       string;
  onChange:    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?:      string;
  type?:       string;
  placeholder?: string;
  textarea?:   boolean;
  required?:   boolean;
  hint?:       string;
}> = ({ label, name, value, onChange, error, type = 'text', placeholder, textarea, required, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {textarea ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={2}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2
          focus:ring-sky-400 resize-none
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`}
      />
    ) : (
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2
          focus:ring-sky-400
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`}
      />
    )}
    {error
      ? <p className="mt-1 text-xs text-red-500">{error}</p>
      : hint
        ? <p className="mt-1 text-xs text-gray-400">{hint}</p>
        : null
    }
  </div>
);

const TIMEZONES = [
  { value: 'Asia/Manila',      label: 'Philippines (UTC+8)' },
  { value: 'Asia/Singapore',   label: 'Singapore (UTC+8)' },
  { value: 'Asia/Hong_Kong',   label: 'Hong Kong (UTC+8)' },
  { value: 'Asia/Tokyo',       label: 'Japan (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/11)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'Europe/London',    label: 'London (UTC+0/1)' },
];

// ── Main component ────────────────────────────────────────────────────────────
export const ClinicProfile: React.FC = () => {
  const { user, setAuth, tokens } = useAuthStore();

  const [clinic,      setClinic]      = useState<ClinicProfileType | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);
  const [isEditing,   setIsEditing]   = useState(false);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [errors,      setErrors]      = useState<Partial<Record<string, string>>>({});

  const [form, setForm] = useState({
    name:                    '',
    email:                   '',
    phone:                   '',
    address:                 '',
    city:                    '',
    province:                '',
    postal_code:             '',
    website:                 '',
    tin:                     '',
    philhealth_accreditation: '',
    timezone:                'Asia/Manila',
  });

  // ── Load clinic ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getMyClinic();
        setClinic(data);
        syncFormFromClinic(data);
      } catch {
        setLoadError('Failed to load clinic profile. Please refresh.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const syncFormFromClinic = (data: ClinicProfileType) => {
    setForm({
      name:                    data.name                     || '',
      email:                   data.email                    || '',
      phone:                   data.phone                    || '',
      address:                 data.address                  || '',
      city:                    data.city                     || '',
      province:                data.province                 || '',
      postal_code:             data.postal_code              || '',
      website:                 data.website                  || '',
      tin:                     data.tin                      || '',
      philhealth_accreditation: data.philhealth_accreditation || '',
      timezone:                data.timezone                 || 'Asia/Manila',
    });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())     errs.name     = 'Clinic name is required.';
    if (!form.email.trim())    errs.email    = 'Clinic email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                               errs.email    = 'Invalid email format.';
    if (!form.phone.trim())    errs.phone    = 'Phone number is required.';
    if (!form.address.trim())  errs.address  = 'Address is required.';
    if (!form.city.trim())     errs.city     = 'City is required.';
    if (!form.province.trim()) errs.province = 'Province is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCancel = () => {
    if (clinic) syncFormFromClinic(clinic);
    setErrors({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!validate() || !clinic) return;
    setIsSaving(true);
    try {
      const payload: ClinicProfileSetupPayload = { ...form };
      const updated = await setupClinicProfile(clinic.id, payload);
      setClinic(updated);
      syncFormFromClinic(updated);

      // Keep auth store in sync
      if (user && tokens) {
        setAuth({ ...user, clinic_setup_complete: true }, tokens);
      }

      toast.success('Clinic profile updated successfully.');
      setIsEditing(false);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.keys(data).forEach((key) => {
          if (Array.isArray(data[key]))       fieldErrors[key] = data[key][0];
          else if (typeof data[key] === 'string') fieldErrors[key] = data[key];
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          toast.error('Please fix the errors below.');
          return;
        }
      }
      toast.error(data?.detail || 'Failed to update clinic profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <p className="text-sm">Loading clinic profile…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (loadError || !clinic) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-gray-600">{loadError ?? 'Clinic not found.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinic Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your clinic's information, contact details, and regulatory data.
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600
              bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border
                border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg hover:from-sky-600
                hover:to-blue-700 disabled:opacity-60 transition-all shadow-sm"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Logo + Identity Card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200
            flex items-center justify-center overflow-hidden flex-shrink-0">
            {clinic.logo_url ? (
              <img
                src={clinic.logo_url}
                alt="Clinic logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageOff className="w-7 h-7 text-gray-300" />
            )}
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900 truncate">{clinic.name}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {clinic.branch_code && (
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {clinic.branch_code}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                ${clinic.is_active
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${clinic.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                {clinic.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs font-medium bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">
                {clinic.subscription_plan}
              </span>
              {clinic.is_main_branch && (
                <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                  Main Branch
                </span>
              )}
              {clinic.setup_complete && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Setup Complete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logo upload hint when editing */}
        {isEditing && (
          <p className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            💡 To update the clinic logo, use the{' '}
            <span className="font-medium text-sky-600">Clinic Setup</span> page which supports logo uploads.
          </p>
        )}
      </div>

      {/* ── Basic Information ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-500" />
          Basic Information
        </h3>

        {isEditing ? (
          <div className="space-y-4">
            <EditField
              label="Clinic Name" name="name" value={form.name}
              onChange={handleChange} error={errors.name}
              placeholder="e.g. MES Health Clinic" required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField
                label="Clinic Email" name="email" type="email" value={form.email}
                onChange={handleChange} error={errors.email}
                placeholder="clinic@example.com" required
                hint="Used for appointments, invoices & patient emails"
              />
              <EditField
                label="Phone" name="phone" value={form.phone}
                onChange={handleChange} error={errors.phone}
                placeholder="09XXXXXXXXX" required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField
                label="Website" name="website" value={form.website}
                onChange={handleChange} placeholder="https://yourclinic.com"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm
                    focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <InfoRow icon={<Building2 className="w-4 h-4" />} label="Clinic Name"  value={clinic.name} />
            <InfoRow icon={<Mail      className="w-4 h-4" />} label="Clinic Email" value={clinic.email} />
            <InfoRow icon={<Phone     className="w-4 h-4" />} label="Phone"        value={clinic.phone} />
            <InfoRow icon={<Globe     className="w-4 h-4" />} label="Website"      value={clinic.website} />
            <InfoRow icon={<Clock     className="w-4 h-4" />} label="Timezone"     value={clinic.timezone} />
          </div>
        )}
      </div>

      {/* ── Location ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-500" />
          Location
        </h3>

        {isEditing ? (
          <div className="space-y-4">
            <EditField
              label="Street Address" name="address" value={form.address}
              onChange={handleChange} error={errors.address}
              placeholder="Unit/Floor, Building, Street"
              textarea required
            />

            {/* Province + City dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhLocationSelect
                province={form.province}
                city={form.city}
                onProvinceChange={(val) => {
                  setForm(prev => ({ ...prev, province: val, city: '' }));
                  setErrors(prev => ({ ...prev, province: undefined, city: undefined }));
                }}
                onCityChange={(val) => {
                  setForm(prev => ({ ...prev, city: val }));
                  setErrors(prev => ({ ...prev, city: undefined }));
                }}
                provinceError={errors.province}
                cityError={errors.city}
                required
              />
            </div>

            {/* Postal Code */}
            <div className="sm:w-1/3">
              <EditField
                label="Postal Code" name="postal_code" value={form.postal_code}
                onChange={handleChange} placeholder="6000"
              />
            </div>
          </div>
        ) : (
          <div>
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address"     value={clinic.address} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="City"        value={clinic.city} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Province"    value={clinic.province} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Postal Code" value={clinic.postal_code} />
          </div>
        )}
      </div>

      {/* ── Regulatory Information ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-500" />
          Regulatory Information
          {!isEditing && <span className="text-xs font-normal text-gray-400 normal-case tracking-normal">(optional)</span>}
        </h3>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EditField
              label="TIN" name="tin" value={form.tin}
              onChange={handleChange} placeholder="000-000-000-000" mono
            />
            <EditField
              label="PhilHealth Accreditation" name="philhealth_accreditation"
              value={form.philhealth_accreditation}
              onChange={handleChange} placeholder="Accreditation number"
            />
          </div>
        ) : (
          <div>
            <InfoRow
              icon={<BadgeCheck className="w-4 h-4" />}
              label="TIN"
              value={clinic.tin}
              mono
            />
            <InfoRow
              icon={<BadgeCheck className="w-4 h-4" />}
              label="PhilHealth Accreditation"
              value={clinic.philhealth_accreditation}
            />
          </div>
        )}
      </div>

      {/* ── System Info (read-only) ──────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          System Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="Created"
            value={new Date(clinic.created_at).toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          />
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="Last Updated"
            value={new Date(clinic.updated_at).toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          />
        </div>
      </div>

    </div>
  );
};