import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Phone, Heart } from 'lucide-react';
import type { Patient, CreatePatientData } from '@/types';
import { useAuthStore } from '@/store/auth.store';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePatientData) => Promise<void>;
  patient?: Patient | null;
  mode: 'create' | 'edit';
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patient,
  mode,
}) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'emergency' | 'medical'>('personal');

  const emptyForm: CreatePatientData = {
    clinic: user?.clinic || 0,
    first_name: '', middle_name: '', last_name: '',
    date_of_birth: '', gender: 'M',
    email: '', phone: '',
    address: '', city: '', province: '', postal_code: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    philhealth_number: '', hmo_provider: '', hmo_number: '',
    medical_conditions: '', allergies: '', medications: '',
  };

  const [formData, setFormData] = useState<CreatePatientData>(emptyForm);

  useEffect(() => {
    if (mode === 'edit' && patient) {
      setFormData({
        clinic: patient.clinic,
        first_name: patient.first_name, middle_name: patient.middle_name || '',
        last_name: patient.last_name, date_of_birth: patient.date_of_birth,
        gender: patient.gender, email: patient.email || '', phone: patient.phone,
        address: patient.address, city: patient.city, province: patient.province,
        postal_code: patient.postal_code || '',
        emergency_contact_name: patient.emergency_contact_name,
        emergency_contact_phone: patient.emergency_contact_phone,
        emergency_contact_relationship: patient.emergency_contact_relationship,
        philhealth_number: patient.philhealth_number || '',
        hmo_provider: patient.hmo_provider || '', hmo_number: patient.hmo_number || '',
        medical_conditions: patient.medical_conditions || '',
        allergies: patient.allergies || '', medications: patient.medications || '',
      });
    }
  }, [mode, patient]);

  useEffect(() => {
    if (!isOpen) {
      setFormData(emptyForm);
      setErrors({});
      setActiveTab('personal');
    }
  }, [isOpen, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.province.trim()) newErrors.province = 'Province is required';
    if (!formData.emergency_contact_name.trim()) newErrors.emergency_contact_name = 'Emergency contact name is required';
    if (!formData.emergency_contact_phone.trim()) newErrors.emergency_contact_phone = 'Emergency contact phone is required';
    if (!formData.emergency_contact_relationship.trim()) newErrors.emergency_contact_relationship = 'Relationship is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.date_of_birth && new Date(formData.date_of_birth) > new Date()) newErrors.date_of_birth = 'Date of birth cannot be in the future';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const errorField = Object.keys(errors)[0];
      if (['first_name', 'middle_name', 'last_name', 'date_of_birth', 'gender'].includes(errorField)) setActiveTab('personal');
      else if (['email', 'phone', 'address', 'city', 'province', 'postal_code'].includes(errorField)) setActiveTab('contact');
      else if (errorField.startsWith('emergency_')) setActiveTab('emergency');
      else setActiveTab('medical');
      return;
    }
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      if (error.response?.data) setErrors(error.response.data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'personal' as const, label: 'Personal', icon: User },
    { id: 'contact' as const, label: 'Contact', icon: MapPin },
    { id: 'emergency' as const, label: 'Emergency', icon: Phone },
    { id: 'medical' as const, label: 'Medical', icon: Heart },
  ];

  const inputBase = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent';
  const inputError = 'border-red-300 bg-red-50';
  const labelBase = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] pointer-events-auto overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {mode === 'create' ? 'Add New Client' : 'Edit Client'}
                </h2>
                <p className="text-xs text-gray-500">
                  {mode === 'create' ? 'Enter client information' : `Editing ${patient?.full_name || 'client'}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close modal">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-gray-200 bg-gray-50 px-4 flex-shrink-0 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 px-6 py-5 space-y-4">

              {/* Personal Info */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelBase}>First Name <span className="text-red-500">*</span></label>
                      <input type="text" name="first_name" value={formData.first_name} onChange={handleChange}
                        className={`${inputBase} ${errors.first_name ? inputError : ''}`} placeholder="John" />
                      {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>Middle Name</label>
                      <input type="text" name="middle_name" value={formData.middle_name} onChange={handleChange}
                        className={inputBase} placeholder="D." />
                    </div>
                    <div>
                      <label className={labelBase}>Last Name <span className="text-red-500">*</span></label>
                      <input type="text" name="last_name" value={formData.last_name} onChange={handleChange}
                        className={`${inputBase} ${errors.last_name ? inputError : ''}`} placeholder="Doe" />
                      {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelBase}>Date of Birth <span className="text-red-500">*</span></label>
                      <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        className={`${inputBase} ${errors.date_of_birth ? inputError : ''}`} />
                      {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>Gender <span className="text-red-500">*</span></label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className={inputBase}>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {activeTab === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelBase}>Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange}
                        className={`${inputBase} ${errors.email ? inputError : ''}`} placeholder="john.doe@example.com" />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>Phone <span className="text-red-500">*</span></label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                        className={`${inputBase} ${errors.phone ? inputError : ''}`} placeholder="+63 912 345 6789" />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                  <div>
                    <label className={labelBase}>Address <span className="text-red-500">*</span></label>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows={2}
                      className={`${inputBase} resize-none ${errors.address ? inputError : ''}`} placeholder="123 Main Street, Barangay..." />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelBase}>City <span className="text-red-500">*</span></label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange}
                        className={`${inputBase} ${errors.city ? inputError : ''}`} placeholder="Manila" />
                      {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>Province <span className="text-red-500">*</span></label>
                      <input type="text" name="province" value={formData.province} onChange={handleChange}
                        className={`${inputBase} ${errors.province ? inputError : ''}`} placeholder="Metro Manila" />
                      {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>Postal Code</label>
                      <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange}
                        className={inputBase} placeholder="1000" />
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {activeTab === 'emergency' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelBase}>Emergency Contact Name <span className="text-red-500">*</span></label>
                    <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange}
                      className={`${inputBase} ${errors.emergency_contact_name ? inputError : ''}`} placeholder="Jane Doe" />
                    {errors.emergency_contact_name && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_name}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelBase}>Emergency Contact Phone <span className="text-red-500">*</span></label>
                      <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange}
                        className={`${inputBase} ${errors.emergency_contact_phone ? inputError : ''}`} placeholder="+63 912 345 6789" />
                      {errors.emergency_contact_phone && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_phone}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>Relationship <span className="text-red-500">*</span></label>
                      <input type="text" name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange}
                        className={`${inputBase} ${errors.emergency_contact_relationship ? inputError : ''}`} placeholder="Spouse, Parent, Sibling..." />
                      {errors.emergency_contact_relationship && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_relationship}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Info */}
              {activeTab === 'medical' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelBase}>PhilHealth Number</label>
                      <input type="text" name="philhealth_number" value={formData.philhealth_number} onChange={handleChange}
                        className={inputBase} placeholder="PH-123456789" />
                    </div>
                    <div>
                      <label className={labelBase}>HMO Provider</label>
                      <input type="text" name="hmo_provider" value={formData.hmo_provider} onChange={handleChange}
                        className={inputBase} placeholder="Maxicare, PhilCare..." />
                    </div>
                    <div>
                      <label className={labelBase}>HMO Number</label>
                      <input type="text" name="hmo_number" value={formData.hmo_number} onChange={handleChange}
                        className={inputBase} placeholder="MAX-123456" />
                    </div>
                  </div>
                  <div>
                    <label className={labelBase}>Medical Conditions</label>
                    <textarea name="medical_conditions" value={formData.medical_conditions} onChange={handleChange}
                      rows={3} className={`${inputBase} resize-none`} placeholder="Current medical conditions..." />
                  </div>
                  <div>
                    <label className={labelBase}>Allergies</label>
                    <textarea name="allergies" value={formData.allergies} onChange={handleChange}
                      rows={2} className={`${inputBase} resize-none`} placeholder="Known allergies..." />
                  </div>
                  <div>
                    <label className={labelBase}>Current Medications</label>
                    <textarea name="medications" value={formData.medications} onChange={handleChange}
                      rows={3} className={`${inputBase} resize-none`} placeholder="Current medications and dosages..." />
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : mode === 'create' ? 'Add Client' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};