import React from 'react';
import { MapPin, Calendar, Clock, User } from 'lucide-react';
import type { PortalData, PortalPractitioner, PortalService } from '@/types/portal';

interface PortalSidebarProps {
  portal:               PortalData;
  selectedPractitioner: PortalPractitioner | null;
  selectedService:      PortalService | null;
  selectedDate:         string;
  selectedSlot:         string;
  currentStep:          number;   // 1=practitioner, 2=service, 3=details
}

const STEPS = ['Practitioner', 'Service', 'Your Details'];

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  portal,
  selectedPractitioner,
  selectedService,
  selectedDate,
  selectedSlot,
  currentStep,
}) => {
  return (
    <aside className="w-64 flex-shrink-0 bg-teal-600 min-h-screen flex flex-col p-4 gap-3">

      {/* Logo */}
      <div className="bg-white rounded-xl p-4 flex items-center justify-center h-28 shadow-sm">
        {portal.clinic_logo ? (
          <img
            src={portal.clinic_logo}
            alt={portal.clinic_name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-lg font-bold text-gray-700 text-center leading-tight">
            {portal.clinic_name}
          </span>
        )}
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5 text-teal-500 flex-shrink-0" />
          <span className="leading-snug">
            {portal.clinic_address || portal.clinic_name}
          </span>
        </div>
      </div>

      {/* Steps tracker */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        {STEPS.map((label, i) => {
          const stepNum  = i + 1;
          const isDone   = currentStep > stepNum;
          const isActive = currentStep === stepNum;
          return (
            <div key={label} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
                  isDone
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : isActive
                    ? 'border-teal-500 text-teal-600 bg-white'
                    : 'border-gray-300 text-gray-400 bg-white'
                }`}
              >
                {isDone ? '✓' : stepNum}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? 'text-teal-700' : isDone ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected practitioner */}
      {selectedPractitioner && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
            {selectedPractitioner.avatar_url ? (
              <img
                src={selectedPractitioner.avatar_url}
                alt={selectedPractitioner.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 text-center leading-tight">
            {selectedPractitioner.full_name}
          </p>
          {selectedPractitioner.specialization && (
            <p className="text-xs text-gray-400 text-center">
              {selectedPractitioner.specialization}
            </p>
          )}
        </div>
      )}

      {/* Selected service */}
      {selectedService && (
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Service
          </p>
          <p className="text-sm font-medium text-gray-800">{selectedService.name}</p>
          <p className="text-xs text-gray-400">{selectedService.duration_minutes} min</p>
        </div>
      )}

      {/* Appointment details */}
      {selectedService && selectedDate && selectedSlot && (
        <div className="bg-white rounded-xl p-3 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Appointment
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{selectedSlot}</span>
          </div>
        </div>
      )}
    </aside>
  );
};