import React, { useState } from 'react';
import { User, Mail, Phone, FileText, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatPHPhone } from '@/utils/phoneFormatter';
import { validateDOB, isMinorAge } from '@/utils/validation';
import { ShieldAlert, MapPin } from 'lucide-react';

export interface PatientFormData {
  first_name:    string;
  last_name:     string;
  email:         string;
  phone:         string;
  date_of_birth: string;
  notes:         string;
  is_returning_patient?: boolean;
  
  // Minor fields
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address_street?: string;
  address_barangay?: string;
  address_city?: string;
  address_province?: string;
}

interface PatientDetailsFormProps {
  formData:  PatientFormData;
  formError: string | null;
  onChange:  (data: PatientFormData) => void;
  acceptedTerms: boolean;
  acceptedConsent: boolean;
  acceptedClinicConsent: boolean;
  signatureReady: boolean;
  clinicConsentReady: boolean;
  hasClinicConsentForm?: boolean;
  onTermsChange: (checked: boolean) => void;
  onOpenTerms: () => void;
  onOpenConsent: () => void;
  onOpenClinicConsent: () => void;
  onCheckEmail: (email: string, dob: string) => Promise<{
    match: boolean;
    initials?: string;
    phone_last4?: string;
  }>;
}

export type EmailCheckStatus = 'idle' | 'checking' | 'found' | 'not-found';

export const PatientDetailsForm: React.FC<PatientDetailsFormProps> = ({
  formData,
  formError,
  onChange,
  acceptedTerms,
  acceptedConsent,
  acceptedClinicConsent,
  signatureReady,
  clinicConsentReady,
  hasClinicConsentForm,
  onTermsChange,
  onOpenTerms,
  onOpenConsent,
  onOpenClinicConsent,
  onCheckEmail,
}) => {
  const [checkStatus, setCheckStatus] = useState<EmailCheckStatus>('idle');
  const [checkError, setCheckError] = useState<string | null>(null);

  const handleCheckEmail = async () => {
    const email = formData.email.trim();
    if (!email) {
      setCheckError('Please enter your email address first.');
      return;
    }
    if (!email.includes('@') || !email.toLowerCase().endsWith('.com')) {
      setCheckError('Please enter a valid email address ending with .com (e.g. name@example.com).');
      return;
    }
    const dobError = validateDOB(formData.date_of_birth);
    if (dobError) {
      setCheckError(dobError);
      return;
    }
    setCheckStatus('checking');
    setCheckError(null);
    try {
      const res = await onCheckEmail(formData.email, formData.date_of_birth);
      if (res.match) {
        setCheckStatus('found');
        // Inject returning patient flag and clear name fields
        onChange({
          ...formData,
          first_name: '',
          last_name: '',
          phone: res.phone_last4 ? `********${res.phone_last4}` : '',
          is_returning_patient: true,
          _initials: res.initials, // Just for UI rendering here
        } as any);
      } else {
        setCheckStatus('not-found');
        onChange({
          ...formData,
          is_returning_patient: false,
        });
      }
    } catch {
      setCheckError('Failed to verify email. Please try again.');
      setCheckStatus('idle');
    }
  };
  const set = (field: keyof PatientFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === 'phone' ? formatPHPhone(e.target.value) : e.target.value;
      onChange({ ...formData, [field]: value });
    };

  return (
    <div className="space-y-4 w-full">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Booking Details</h2>
        <p className="text-sm text-gray-500 mt-1">
          Please fill in your contact information to complete the booking.
        </p>
      </div>

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {formError}
        </div>
      )}
      {checkError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {checkError}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">

        {/* Always visible: Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => {
                set('email')(e);
                if (checkStatus !== 'idle') setCheckStatus('idle'); // Reset if they edit email
              }}
              disabled={checkStatus === 'checking'}
              className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500 bg-gray-50 transition-colors"
              placeholder="Enter Email"
            />
          </div>
        </div>

        {/* Always visible: Date of Birth */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              autoComplete="bday"
              value={formData.date_of_birth}
              onChange={(e) => {
                set('date_of_birth')(e);
                if (checkStatus !== 'idle') setCheckStatus('idle'); // Reset if they edit dob
              }}
              max={new Date().toISOString().split('T')[0]}
              disabled={checkStatus === 'checking'}
              className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500 bg-gray-50 transition-colors"
            />
          </div>
        </div>

        {/* Stage 1: Email Check Button */}
        {checkStatus === 'idle' && (
          <button
            type="button"
            onClick={handleCheckEmail}
            className="w-full flex items-center justify-center gap-2 bg-[#0575E6] hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* Stage 2 (Checking) */}
        {checkStatus === 'checking' && (
          <div className="flex items-center justify-center py-4 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-[#0575E6] border-r-[#5CDB95] mr-3" />
            Checking email...
          </div>
        )}

        {/* Stage 3 (Found): Returning Patient Card */}
        {checkStatus === 'found' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-green-900">Welcome back!</h3>
                <p className="text-sm text-green-800 mt-1">
                  Patient: <strong>{(formData as any)._initials}</strong>
                </p>
                <div className="mt-2 text-xs text-green-800 space-y-1">
                  <p><strong>Phone ending in:</strong> {(formData as any).phone?.replace(/\*/g, '')}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckStatus('idle');
                      onChange({ ...formData, email: '', date_of_birth: '', is_returning_patient: false });
                    }}
                    className="text-xs font-medium text-green-700 hover:text-green-800 underline"
                  >
                    Not You? Edit Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3 (Not Found): Full Form */}
        {checkStatus === 'not-found' && (
          <>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 mb-4">
              Looks like you're a new patient. Please complete your details below.
            </div>

            {/* Row 1 — First Name / Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              First Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="first_name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                value={formData.first_name}
                onChange={set('first_name')}
                className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                placeholder="Enter First Name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Last Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="last_name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                value={formData.last_name}
                onChange={set('last_name')}
                className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                placeholder="Enter Last Name"
              />
            </div>
          </div>
        </div>

        {/* Row 2 — Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mobile Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={set('phone')}
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                  placeholder="(+63) 9XX XXX XXXX"
                />
              </div>
            </div>
          </div>
          
          {/* Minor Section - conditionally rendered */}
          {formData.date_of_birth && isMinorAge(formData.date_of_birth) && (
            <div className="mt-8 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="border-t border-gray-100 mb-6" />
              
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#0575E6]" />
                  Parent / Guardian Information
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Required for patients under 18 years old.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Emergency Contact Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="emergency_contact_name"
                      type="text"
                      value={formData.emergency_contact_name || ''}
                      onChange={set('emergency_contact_name')}
                      className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                      placeholder="Full Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Emergency Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone || ''}
                      onChange={set('emergency_contact_phone')}
                      className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                      placeholder="(+63) 9XX XXX XXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#0575E6]" />
                  Address
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Please provide your complete residential address.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="address_street"
                    type="text"
                    value={formData.address_street || ''}
                    onChange={set('address_street')}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                    placeholder="House/Unit No., Street, Subdivision"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Barangay <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="address_barangay"
                      type="text"
                      value={formData.address_barangay || ''}
                      onChange={set('address_barangay')}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                      placeholder="Barangay"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      City/Municipality <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="address_city"
                      type="text"
                      value={formData.address_city || ''}
                      onChange={set('address_city')}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="address_province"
                      type="text"
                      value={formData.address_province || ''}
                      onChange={set('address_province')}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                      placeholder="Province"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* Divider - only show if past the check phase */}
        {(checkStatus === 'found' || checkStatus === 'not-found') && (
          <>
            <div className="border-t border-gray-100" />

        {/* Notes — full width */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Notes{' '}
            <span className="text-gray-400 font-normal">Please specify your concerns...</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={set('notes')}
              className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 resize-none"
              placeholder="Any additional information for the practitioner..."
            />
          </div>
        </div>

        {/* Compliance */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => onTermsChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">
              I agree to the{' '}
              <button
                type="button"
                onClick={onOpenTerms}
                className="text-sky-600 underline hover:text-sky-700"
              >
                Terms & Conditions
              </button>{' '}
              <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer" onClick={onOpenConsent}>
            <input
              type="checkbox"
              checked={acceptedConsent}
              readOnly
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">
              I consent to the{' '}
              <button
                type="button"
                onClick={onOpenConsent}
                className="text-sky-600 underline hover:text-sky-700"
              >
                Data Privacy Policy
              </button>{' '}
              <span className="text-red-500">*</span>
              <span className="block text-xs text-gray-500 mt-1">
                A signed consent form is required before booking can proceed.
              </span>
            </span>
          </label>

          {acceptedConsent && (
            <p className={`text-xs ${signatureReady ? 'text-emerald-600' : 'text-amber-600'}`}>
              {signatureReady ? 'Consent signed and saved.' : 'Consent checked but signature is missing.'}
            </p>
          )}

          {hasClinicConsentForm && (
          <label className="flex items-start gap-3 cursor-pointer" onClick={onOpenClinicConsent}>
            <input
              type="checkbox"
              checked={acceptedClinicConsent}
              readOnly
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={onOpenClinicConsent}
                className="text-sky-600 underline hover:text-sky-700"
              >
                Clinic Consent Form
              </button>{' '}
              <span className="text-red-500">*</span>
              <span className="block text-xs text-gray-500 mt-1">
                {clinicConsentReady ? 'Clinic consent signed and saved.' : 'Please review and sign the clinic consent form.'}
              </span>
            </span>
          </label>
        )}
          </div>
          </>
        )}
      </form>
    </div>
  );
};