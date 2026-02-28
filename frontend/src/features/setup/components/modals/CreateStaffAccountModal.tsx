import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Building2 } from 'lucide-react';
import type { CreateStaffData, StaffFormErrors, StaffMember } from '../../types/staff.types';
import { TITLE_OPTIONS, DISCIPLINE_OPTIONS, GENDER_OPTIONS } from '../../types/staff.types';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';

interface CreateStaffAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffData) => Promise<void>;
  /** Pass a StaffMember to switch the modal into edit mode */
  editingStaff?: StaffMember | null;
}

const EMPTY_FORM: CreateStaffData = {
  first_name: '',
  last_name: '',
  middle_name: '',
  nickname: '',
  title: 'Mr',
  position: '',
  discipline: 'OCCUPATIONAL_THERAPY',
  email: '',
  phone: '',
  address: '',
  date_of_birth: '',
  gender: 'Male',
  role: 'STAFF',
  clinic_branch: null,
};

export const CreateStaffAccountModal: React.FC<CreateStaffAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingStaff = null,
}) => {
  const isEditMode = !!editingStaff;

  const [formData, setFormData] = useState<CreateStaffData>(EMPTY_FORM);
  const [errors, setErrors]     = useState<StaffFormErrors>({});
  const [loading, setLoading]   = useState(false);

  // Fetch clinic branches for the dropdown
  const { branches, loading: loadingBranches } = useClinicBranches();

  // Populate form when editing
  useEffect(() => {
    if (editingStaff) {
      setFormData({
        first_name:    editingStaff.first_name,
        last_name:     editingStaff.last_name,
        middle_name:   editingStaff.middle_name  ?? '',
        nickname:      editingStaff.nickname      ?? '',
        title:         editingStaff.title         ?? 'Mr',
        position:      editingStaff.position      ?? '',
        discipline:    editingStaff.discipline    ?? 'OCCUPATIONAL_THERAPY',
        email:         editingStaff.email,
        phone:         editingStaff.phone,
        address:       editingStaff.address       ?? '',
        date_of_birth: editingStaff.date_of_birth ?? '',
        gender:        editingStaff.gender        ?? 'Male',
        role:          editingStaff.role,
        clinic_branch: editingStaff.clinic_branch ?? null,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [editingStaff, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: StaffFormErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim())  newErrors.last_name  = 'Last name is required';
    if (!formData.position?.trim())  newErrors.position   = 'Position is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const cleaned = formData.phone.replace(/[\s-]/g, '');
      if (
        !(cleaned.startsWith('09')   && cleaned.length === 11) &&
        !(cleaned.startsWith('+639') && cleaned.length === 13)
      ) {
        newErrors.phone = 'Invalid phone format. Use 09XXXXXXXXX or +639XXXXXXXXX';
      }
    }

    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      if (birthDate > new Date()) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to save staff account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isEditMode ? 'Edit Staff Account' : 'Create Staff Account'}
                  </h2>
                  <p className="text-sm text-white/80">
                    {isEditMode
                      ? `Editing ${editingStaff?.first_name} ${editingStaff?.last_name}`
                      : 'Add a new staff member to your practice'
                    }
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">

            {/* Error Alert */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Info Alert — only on create */}
            {!isEditMode && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  A temporary password will be automatically generated and sent to the staff
                  member's email address. They will be required to change it upon first login.
                </p>
              </div>
            )}

            <div className="space-y-6">

              {/* ── Personal Information ── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {TITLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="John"
                    />
                    {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
                  </div>

                  {/* Middle Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                    <input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Doe"
                    />
                    {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
                  </div>

                  {/* Nickname */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nickname</label>
                    <input
                      type="text"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.date_of_birth ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.date_of_birth && <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {GENDER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Professional Information ── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Professional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Position */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.position ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="e.g., Clinic Desk, Office Manager"
                    />
                    {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position}</p>}
                  </div>

                  {/* Discipline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discipline <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.discipline}
                      onChange={(e) => setFormData({ ...formData, discipline: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {DISCIPLINE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Role */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio" name="role" value="STAFF"
                          checked={formData.role === 'STAFF'}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                          className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Staff</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio" name="role" value="PRACTITIONER"
                          checked={formData.role === 'PRACTITIONER'}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                          className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Practitioner</span>
                      </label>
                    </div>
                  </div>

                  {/* ── Clinic Branch Assignment ── */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-teal-500" />
                        Assign to Clinic Branch
                      </span>
                    </label>
                    {loadingBranches ? (
                      <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
                        Loading branches...
                      </div>
                    ) : branches.length === 0 ? (
                      <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
                        No branches available
                      </div>
                    ) : (
                      <select
                        value={formData.clinic_branch ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            clinic_branch: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="">— No specific branch (all branches) —</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                            {branch.is_main_branch ? ' (Main)' : ''}
                            {branch.city ? ` · ${branch.city}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Assigning a branch will allow filtering staff/practitioners per location in the diary.
                    </p>
                  </div>

                </div>
              </div>

              {/* ── Contact Information ── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 gap-4">

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={isEditMode} // email shouldn't change on edit
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'} ${isEditMode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                      placeholder="john.doe@example.com"
                    />
                    {isEditMode && (
                      <p className="mt-1 text-xs text-gray-400">Email cannot be changed after account creation.</p>
                    )}
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Street, City, Province, ZIP Code"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEditMode ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {isEditMode ? 'Save Changes' : 'Create Staff Account'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};