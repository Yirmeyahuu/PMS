import React from 'react';
import { Download } from 'lucide-react';

export const DataMenu2: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Download className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Menu 2</h2>
            <p className="text-gray-600">Data export and import</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Data subpage 2</strong>. Export patient data, 
            import records, and manage data transfers.
          </p>
        </div>
      </div>
    </div>
  );
};