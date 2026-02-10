import React from 'react';
import { BarChart3 } from 'lucide-react';

export const DataMenu1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Menu 1</h2>
            <p className="text-gray-600">Analytics and reporting</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Data subpage 1</strong>. Access analytics dashboards, 
            generate reports, and view practice statistics.
          </p>
        </div>
      </div>
    </div>
  );
};