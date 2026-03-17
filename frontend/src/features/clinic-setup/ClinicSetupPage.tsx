import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { PhLocationSelect } from '@/components/location/PhLocationSelect';
import { getMyClinic, setupClinicProfile } from '@/features/clinics/clinic.api';
import type { ClinicProfileSetupPayload } from '@/features/clinics/clinic.api';
import {
  Building2, MapPin, Phone, Mail, Globe, FileText,
  Upload, X, ChevronRight, CheckCircle2, Loader2, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FormState {
  name:                    string;
  email:                   string;
  phone:                   string;
  address:                 string;
  city:                    string;
  province:                string;
  postal_code:             string;
  website:                 string;
  tin:                     string;
  philhealth_accreditation: string;
  timezone:                string;
}

const TIMEZONES = [
  { value: 'Asia/Manila',      label: 'Philippines (UTC+8)' },
  { value: 'Asia/Singapore',   label: 'Singapore (UTC+8)' },
  { value: 'Asia/Hong_Kong',   label: 'Hong Kong (UTC+8)' },
  { value: 'Asia/Tokyo',       label: 'Japan (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/11)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'Europe/London',    label: 'London (UTC+0/1)' },
];

export const ClinicSetupPage: React.FC = () => {
  const navigate              = useNavigate();
  const { user, setAuth, tokens } = useAuthStore();

  const [isLoading,    setIsLoading]    = useState(false);
  const [clinicId,     setClinicId]     = useState<number | null>(null);
  const [logoFile,     setLogoFile]     = useState<File | null>(null);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);
  const [errors,       setErrors]       = useState<Partial<Record<keyof FormState, string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
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

  // Load existing clinic data on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        const clinic = await getMyClinic();
        setClinicId(clinic.id);
        setForm({
          name:                    clinic.name                     || '',
          // ✅ Do NOT pre-fill clinic email from admin email —
          //    clinic email is a separate business contact address.
          email:                   clinic.email                    || '',
          phone:                   clinic.phone                    || '',
          address:                 clinic.address                  || '',
          city:                    clinic.city                     || '',
          province:                clinic.province                 || '',
          postal_code:             clinic.postal_code              || '',
          website:                 clinic.website                  || '',
          tin:                     clinic.tin                      || '',
          philhealth_accreditation: clinic.philhealth_accreditation || '',
          timezone:                clinic.timezone                 || 'Asia/Manila',
        });
        if (clinic.logo_url) setLogoPreview(clinic.logo_url);
      } catch {
        toast.error('Could not load clinic data. Please refresh.');
      }
    };
    load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim())     newErrors.name     = 'Clinic name is required.';
    if (!form.email.trim())    newErrors.email    = 'Clinic email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                               newErrors.email    = 'Invalid email format.';
    if (!form.phone.trim())    newErrors.phone    = 'Phone number is required.';
    if (!form.address.trim())  newErrors.address  = 'Address is required.';
    if (!form.city.trim())     newErrors.city     = 'City is required.';
    if (!form.province.trim()) newErrors.province = 'Province is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !clinicId) return;

    setIsLoading(true);
    try {
      const payload: ClinicProfileSetupPayload = { ...form };
      if (logoFile) payload.logo = logoFile;

      await setupClinicProfile(clinicId, payload);

      if (user && tokens) {
        setAuth({ ...user, clinic_setup_complete: true }, tokens);
      }

      toast.success('Clinic profile saved! Welcome to MES PMS.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const data = err.response?.data;
      // Show field-level errors from backend if present
      if (data && typeof data === 'object') {
        const fieldErrors: Partial<Record<keyof FormState, string>> = {};
        (Object.keys(data) as (keyof FormState)[]).forEach((key) => {
          if (Array.isArray(data[key])) fieldErrors[key] = data[key][0];
          else if (typeof data[key] === 'string') fieldErrors[key] = data[key];
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          toast.error('Please fix the errors below.');
          return;
        }
      }
      toast.error(data?.detail || 'Failed to save clinic profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Set Up Your Clinic Profile</h1>
          <p className="mt-2 text-gray-500 text-sm max-w-md mx-auto">
            Complete your clinic details to get started. You can update these anytime in Settings.
          </p>
        </div>

        {/* ── Info Banner ───────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
          <Info className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-sky-700">
            <span className="font-semibold">Your personal admin email</span> is used only for logging in.
            Please provide a separate <span className="font-semibold">Clinic Email</span> below — 
            this will be used for appointments, invoices, and all patient communications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Logo Upload ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-500" />
              Clinic Logo
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </h2>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                  : <Building2 className="w-8 h-8 text-gray-300" />
                }
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
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  {logoPreview && (
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

          {/* ── Basic Info ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-500" />
              Basic Information
            </h2>

            {/* Clinic Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. MES Health Clinic"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400
                  ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Clinic Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  Clinic Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="clinic@example.com"
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400
                    ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`}
                />
                {errors.email
                  ? <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  : <p className="mt-1 text-xs text-gray-400">
                      Used for appointments, invoices &amp; patient emails
                    </p>
                }
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="09XXXXXXXXX"
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400
                    ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>

            {/* Website + Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-gray-400" /> Website
                </label>
                <input
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://yourclinic.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Location ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500" />
              Location
            </h2>

            {/* Street Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                placeholder="Unit/Floor, Building, Street"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none
                  ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`}
              />
              {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
            </div>

            {/* Province + City side-by-side */}
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

            {/* Postal Code — separate row */}
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input
                name="postal_code"
                value={form.postal_code}
                onChange={handleChange}
                placeholder="6000"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
            </div>
          </div>

          {/* ── Regulatory Info ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              Regulatory Information
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TIN</label>
                <input
                  name="tin"
                  value={form.tin}
                  onChange={handleChange}
                  placeholder="000-000-000-000"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PhilHealth Accreditation</label>
                <input
                  name="philhealth_accreditation"
                  value={form.philhealth_accreditation}
                  onChange={handleChange}
                  placeholder="Accreditation number"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between gap-4 pb-10">
            <p className="text-xs text-gray-400">
              Fields marked <span className="text-red-500">*</span> are required
            </p>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600
                text-white font-semibold rounded-xl shadow-md hover:from-sky-600 hover:to-blue-700
                disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Complete Setup
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};