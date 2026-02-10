import React from 'react';
import { Building2 } from 'lucide-react';

export const PracticeOption1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Practice Option 1</h2>
            <p className="text-gray-600">Configure practice settings and details</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Practice Option 1</strong> subpage. Configure your practice information,
            business hours, locations, and general settings.
          </p>
        </div>
      </div>
    </div>
  );
};