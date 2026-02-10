import React from 'react';
import { Link } from 'lucide-react';

export const ConnectionsOption1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
            <Link className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Connections Option 1</h2>
            <p className="text-gray-600">Third-party integrations</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Connections Option 1</strong> subpage. Connect with third-party
            services, APIs, and external systems.
          </p>
        </div>
      </div>
    </div>
  );
};