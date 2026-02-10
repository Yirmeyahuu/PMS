import React from 'react';
import { MapPin } from 'lucide-react';

export const PracticeOption2: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
            <MapPin className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Practice Option 2</h2>
            <p className="text-gray-600">Manage practice locations and branches</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Practice Option 2</strong> subpage. Add and manage multiple
            practice locations, branch offices, and service areas.
          </p>
        </div>
      </div>
    </div>
  );
};