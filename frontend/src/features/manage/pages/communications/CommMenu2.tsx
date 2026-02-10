import React from 'react';
import { Bell } from 'lucide-react';

export const CommMenu2: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Bell className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Communications Menu 2</h2>
            <p className="text-gray-600">Notification and reminder settings</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Communications subpage 2</strong>. Set up appointment reminders, 
            automated notifications, and alert systems.
          </p>
        </div>
      </div>
    </div>
  );
};