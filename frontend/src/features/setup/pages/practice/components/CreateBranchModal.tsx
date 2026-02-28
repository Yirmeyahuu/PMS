import React, { useState } from 'react';
import { X, Loader2, GitBranch, Hash } from 'lucide-react';
import type { ClinicBranch, CreateBranchData } from '@/types/clinic';

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateBranchData) => Promise<void>;
  branch?: ClinicBranch | null;
  mode: 'create' | 'edit';
  saving: boolean;
  /** The root clinic name — used to build the branch display name */
  mainClinicName: string;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen, onClose, onSave, branch, mode, saving, mainClinicName,
}) => {
  const emptyForm = {
    location: '',
    email: '', phone: '', address: '',
    city: '', province: '', postal_code: '',
    website: '', tin: '',
  };

  const [form, setForm]     = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derive the "location" suffix from an existing branch name
  // e.g. "Clinic Test - BGC" → "BGC"
  const extractLocation = (fullName: string): string => {
    const sep = fullName.indexOf(' - ');
    return sep !== -1 ? fullName.slice(sep + 3) : fullName;
  };

  React.useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && branch) {
        setForm({
          location:    extractLocation(branch.name),
          email:       branch.email       || '',
          phone:       branch.phone       || '',
          address:     branch.address     || '',
          city:        branch.city        || '',
          province:    branch.province    || '',
          postal_code: branch.postal_code || '',
          website:     branch.website     || '',
          tin:         branch.tin         || '',
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [isOpen, mode, branch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Preview the final composed name
  const composedName = form.location.trim()
    ? `${mainClinicName} - ${form.location.trim()}`
    : mainClinicName;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.location.trim()) errs.location = 'Location / barangay name is required';
    if (!form.email.trim())    errs.email    = 'Email is required';
    if (!form.phone.trim())    errs.phone    = 'Phone is required';
    if (!form.address.trim())  errs.address  = 'Address is required';
    if (!form.city.trim())     errs.city     = 'City is required';
    if (!form.province.trim()) errs.province = 'Province is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Invalid email format';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateBranchData = {
      name:        composedName,
      email:       form.email,
      phone:       form.phone,
      address:     form.address,
      city:        form.city,
      province:    form.province,
      postal_code: form.postal_code,
      website:     form.website,
      tin:         form.tin,
    };
    await onSave(payload);
  };

  if (!isOpen) return null;

  const inputBase =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent';
  const inputErr  = 'border-red-300 bg-red-50';
  const labelBase = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {mode === 'create' ? 'Create New Branch' : 'Edit Branch'}
                </h2>
                <p className="text-xs text-gray-500">
                  {mode === 'create'
                    ? `Adding a branch under ${mainClinicName}`
                    : `Editing: ${branch?.name}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Auto-generated ID notice */}
              {mode === 'create' && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-start gap-2">
                  <Hash className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-sky-700">Auto-generated Branch ID</p>
                    <p className="text-xs text-sky-600 mt-0.5">
                      A unique ID will be assigned automatically.&nbsp;
                      <span className="font-mono font-bold">
                        {mainClinicName.replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '')}-000X
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Edit: read-only branch code */}
              {mode === 'edit' && branch?.branch_code && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                  <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Branch ID</p>
                    <p className="text-sm font-mono font-bold text-gray-800">{branch.branch_code}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                    Auto-generated
                  </span>
                </div>
              )}

              {/* Branch Name composer */}
              <div>
                <label className={labelBase}>
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-0 mb-2 rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent">
                  {/* Fixed prefix */}
                  <span className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-500 border-r border-gray-300 whitespace-nowrap flex-shrink-0">
                    {mainClinicName} —
                  </span>
                  {/* Location suffix input */}
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Barangay / Location name"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
                  />
                </div>
                {errors.location && (
                  <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                )}
                {/* Live preview */}
                {form.location.trim() && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Full name preview:&nbsp;
                    <span className="font-medium text-gray-700">{composedName}</span>
                  </p>
                )}
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="branch@clinic.com"
                    className={`${inputBase} ${errors.email ? inputErr : ''}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className={labelBase}>
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="+63 2 8123 4567"
                    className={`${inputBase} ${errors.phone ? inputErr : ''}`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={labelBase}>
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="address" value={form.address} onChange={handleChange}
                  placeholder="Street address, Barangay"
                  className={`${inputBase} ${errors.address ? inputErr : ''}`}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              {/* City + Province + Postal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelBase}>City <span className="text-red-500">*</span></label>
                  <input
                    type="text" name="city" value={form.city} onChange={handleChange}
                    placeholder="Taguig"
                    className={`${inputBase} ${errors.city ? inputErr : ''}`}
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className={labelBase}>Province <span className="text-red-500">*</span></label>
                  <input
                    type="text" name="province" value={form.province} onChange={handleChange}
                    placeholder="Metro Manila"
                    className={`${inputBase} ${errors.province ? inputErr : ''}`}
                  />
                  {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
                </div>
                <div>
                  <label className={labelBase}>Postal Code</label>
                  <input
                    type="text" name="postal_code" value={form.postal_code} onChange={handleChange}
                    placeholder="1634"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Website + TIN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>Website</label>
                  <input
                    type="url" name="website" value={form.website} onChange={handleChange}
                    placeholder="https://clinic.com"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>TIN</label>
                  <input
                    type="text" name="tin" value={form.tin} onChange={handleChange}
                    placeholder="123-456-789-000"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Subscription inheritance note */}
              {mode === 'create' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <GitBranch className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    This branch will inherit the subscription plan from the main clinic.
                  </p>
                </div>
              )}
            </div>

            {/* Footer — always pinned to bottom */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button" onClick={onClose} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>
                  : <><GitBranch className="w-3.5 h-3.5" />{mode === 'create' ? 'Create Branch' : 'Save Changes'}</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};