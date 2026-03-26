import React, { useEffect, useState, useRef } from 'react';
import {
  Building2, Mail, Phone, MapPin, Globe, FileText,
  Clock, BadgeCheck, Edit2, Loader2, AlertCircle,
  CheckCircle2, X, Edit, Star, Hash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyClinic, setupClinicProfile, getClinicBranches } from '@/features/clinics/clinic.api';
import type { ClinicProfile as ClinicProfileType, ClinicProfileSetupPayload } from '@/features/clinics/clinic.api';
import type { ClinicBranch } from '@/types/clinic';
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
  mono?:       boolean;
}> = ({ label, name, value, onChange, error, type = 'text', placeholder, textarea, required, hint, mono }) => (
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
          ${mono ? 'font-mono' : ''}
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
  const navigate = useNavigate();

  const [clinic,      setClinic]      = useState<ClinicProfileType | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);
  const [isEditing,   setIsEditing]   = useState(false);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [errors,      setErrors]      = useState<Partial<Record<string, string>>>({});
  const [activeTab,   setActiveTab]   = useState<'profile' | 'branches'>('profile');
  const [branches,    setBranches]    = useState<ClinicBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

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

  // Logo state
  const [logoFile,     setLogoFile]     = useState<File | null>(null);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);
  const [logoToRemove, setLogoToRemove]  = useState(false);  // Flag to remove logo
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Load branches when branches tab is active ────────────────────────────────
  useEffect(() => {
    if (activeTab === 'branches') {
      const loadBranches = async () => {
        setLoadingBranches(true);
        try {
          const response = await getClinicBranches();
          setBranches(response.branches);
        } catch {
          toast.error('Failed to load branches');
        } finally {
          setLoadingBranches(false);
        }
      };
      loadBranches();
    }
  }, [activeTab]);

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoToRemove(true);  // Mark logo for removal
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setLogoToRemove(false);  // Reset removal flag
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!validate() || !clinic) return;
    setIsSaving(true);
    try {
      const payload: ClinicProfileSetupPayload = { ...form };
      if (logoFile) payload.logo = logoFile;
      if (logoToRemove) payload.remove_logo = true;

      const updated = await setupClinicProfile(clinic.id, payload);
      setClinic(updated);
      syncFormFromClinic(updated);

      // Keep auth store in sync
      if (user && tokens) {
        setAuth({ ...user, clinic_setup_complete: true }, tokens);
      }

      toast.success('Clinic profile updated successfully.');
      setIsEditing(false);
      setLogoToRemove(false);  // Reset removal flag
    } catch (err: unknown) {
      // Try to extract error data from response
      let data: Record<string, unknown> = {};
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: Record<string, unknown> } }).response;
        if (response?.data) {
          data = response.data;
        }
      }

      if (data && Object.keys(data).length > 0) {
        const fieldErrors: Record<string, string> = {};
        Object.keys(data).forEach((key) => {
          const value = data[key];
          if (Array.isArray(value)) fieldErrors[key] = String(value[0]);
          else if (typeof value === 'string') fieldErrors[key] = value;
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          toast.error('Please fix the errors below.');
          return;
        }
      }
      toast.error((data.detail as string) || 'Failed to update clinic profile.');
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

      {/* ── Chrome-style Tabs ───────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${activeTab === 'profile'
                ? 'bg-white text-gray-900 border-t border-x border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${activeTab === 'branches'
                ? 'bg-white text-gray-900 border-t border-x border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            Clinic Branches
          </button>
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────────── */}
      {activeTab === 'profile' ? (
        <>

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
              <span className="text-lg font-bold text-gray-400 text-center px-2 leading-tight">
                {clinic.name}
              </span>
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
          <div className="mt-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                ) : clinic.logo_url ? (
                  <img src={clinic.logo_url} alt="Current logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-lg font-bold text-gray-400 text-center px-2 leading-tight">
                    {clinic.name}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <div className="flex gap-3">
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                  >
                    {logoPreview || clinic.logo_url ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  {(clinic.logo_url || logoPreview) && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="px-4 py-2 text-sm font-medium text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400">PNG, JPG, SVG up to 5 MB</p>
              </div>
            </div>
          </div>
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

    </>
  ) : (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-500" />
          Clinic Branches
        </h3>
        <button
          onClick={() => navigate('/setup?card=practice&option=option1')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit Branches
        </button>
      </div>

      {loadingBranches ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">No branches found</p>
          <p className="text-xs text-gray-400 mt-1">Add your first clinic branch to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...branches].sort((a, b) => Number(b.is_main_branch) - Number(a.is_main_branch)).map((branch) => (
            <div key={branch.id} className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${branch.is_main_branch ? 'border-sky-300' : 'border-gray-200'}`}>
              <div className={`h-1 ${branch.is_main_branch ? 'bg-sky-500' : 'bg-gray-200'}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${branch.is_main_branch ? 'bg-sky-100' : 'bg-gray-100'}`}>
                      <Building2 className={`w-5 h-5 ${branch.is_main_branch ? 'text-sky-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{branch.name}</h3>
                        {branch.is_main_branch && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex-shrink-0">
                            <Star className="w-3 h-3 fill-sky-500 text-sky-500" />
                            Main Branch
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium mt-0.5 ${branch.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        {branch.is_active ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {branch.branch_code && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
                      <Hash className="w-3 h-3 text-gray-400" />
                      {branch.branch_code}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {(branch.address || branch.city) && (
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{[branch.address, branch.city, branch.province, branch.postal_code].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{branch.email}</span>
                    </div>
                  )}
                  {branch.website && (
                    <div className="flex items-center gap-2 text-xs text-sky-600">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                      <a href={branch.website} target="_blank" rel="noreferrer" className="hover:underline truncate">{branch.website}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
    </div>
  );
};