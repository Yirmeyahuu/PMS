import React from 'react';
import { Shield } from 'lucide-react';

export const Permissions: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-rose-100 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-rose-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Permissions</h2>
            <p className="text-gray-600">Configure user roles and access control</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is the <strong>Permissions</strong> subpage. Set up user roles, permissions,
            and access levels for different staff members.
          </p>
        </div>
      </div>
    </div>
  );
}; 