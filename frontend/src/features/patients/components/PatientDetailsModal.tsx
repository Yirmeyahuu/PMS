import React from 'react';
import { X, User, Mail, Phone, MapPin, Heart, Calendar, Edit } from 'lucide-react';
import type { Patient } from '@/types';

interface PatientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onEdit: () => void;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  isOpen,
  onClose,
  patient,
  onEdit,
}) => {
  if (!isOpen || !patient) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'M': return 'Male';
      case 'F': return 'Female';
      case 'O': return 'Other';
      default: return gender;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] pointer-events-auto transform transition-all overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                {patient.first_name.charAt(0)}
                {patient.last_name.charAt(0)}
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{patient.full_name}</h2>
                <p className="text-green-50">ID: {patient.patient_number}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="text-base font-medium text-gray-900">{patient.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="text-base font-medium text-gray-900">
                      {formatDate(patient.date_of_birth)} ({patient.age} years old)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="text-base font-medium text-gray-900">{getGenderLabel(patient.gender)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`
                      inline-flex px-2 py-1 rounded-full text-xs font-medium
                      ${patient.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                    `}>
                      {patient.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-base font-medium text-gray-900">{patient.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-base font-medium text-gray-900">{patient.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="text-base font-medium text-gray-900">
                      {patient.address}, {patient.city}, {patient.province} {patient.postal_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-base font-medium text-gray-900">{patient.emergency_contact_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-base font-medium text-gray-900">{patient.emergency_contact_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Relationship</p>
                    <p className="text-base font-medium text-gray-900">{patient.emergency_contact_relationship}</p>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                </div>
                <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                  {/* Insurance */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">PhilHealth Number</p>
                      <p className="text-base font-medium text-gray-900">{patient.philhealth_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">HMO Provider</p>
                      <p className="text-base font-medium text-gray-900">{patient.hmo_provider || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">HMO Number</p>
                      <p className="text-base font-medium text-gray-900">{patient.hmo_number || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Medical Conditions */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Medical Conditions</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {patient.medical_conditions || 'None reported'}
                    </p>
                  </div>

                  {/* Allergies */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Allergies</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {patient.allergies || 'None reported'}
                    </p>
                  </div>

                  {/* Medications */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Current Medications</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {patient.medications || 'None reported'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created: {formatDate(patient.created_at)}</span>
                </div>
                <div>
                  <span>Last Updated: {formatDate(patient.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Client
            </button>
          </div>
        </div>
      </div>
    </>
  );
};