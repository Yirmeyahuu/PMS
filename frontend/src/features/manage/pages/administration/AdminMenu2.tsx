import React from 'react';
import { Shield } from 'lucide-react';

export const AdminMenu2: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Administration Menu 2</h2>
            <p className="text-gray-600">Security and access control</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Administration subpage 2</strong>. Security settings, 
            permissions management, and access control configurations.
          </p>
        </div>
      </div>
    </div>
  );
};