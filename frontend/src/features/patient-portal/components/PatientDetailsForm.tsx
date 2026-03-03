import React from 'react';

export interface PatientFormData {
  first_name: string;
  last_name:  string;
  email:      string;
  phone:      string;
  notes:      string;
}

interface PatientDetailsFormProps {
  formData:   PatientFormData;
  formError:  string | null;
  onChange:   (data: PatientFormData) => void;
}

export const PatientDetailsForm: React.FC<PatientDetailsFormProps> = ({
  formData,
  formError,
  onChange,
}) => {
  const set = (field: keyof PatientFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...formData, [field]: e.target.value });

  return (
    <div className="bg-white rounded-xl p-6 space-y-4 max-w-lg">
      <h3 className="font-semibold text-gray-800">Your Details</h3>

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Name row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={set('first_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Juan"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={set('last_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="dela Cruz"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={set('email')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="juan@example.com"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={set('phone')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="09XXXXXXXXX"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={set('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Any additional information..."
        />
      </div>
    </div>
  );
};