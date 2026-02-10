import React from 'react';
import { Database } from 'lucide-react';

export const AdminMenu3: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
            <Database className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Administration Menu 3</h2>
            <p className="text-gray-600">Database and system maintenance</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Administration subpage 3</strong>. Database management, 
            system backups, and maintenance tools.
          </p>
        </div>
      </div>
    </div>
  );
};