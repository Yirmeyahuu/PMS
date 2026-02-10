import React from 'react';
import { FileText } from 'lucide-react';

export const ClinicalMenu2: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-cyan-100 rounded-xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clinical Menu 2</h2>
            <p className="text-gray-600">Clinical documentation templates</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Clinical subpage 2</strong>. Configure clinical note templates, 
            forms, and documentation standards.
          </p>
        </div>
      </div>
    </div>
  );
};