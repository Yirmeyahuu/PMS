import React from 'react';
import { Stethoscope } from 'lucide-react';

export const ClinicalMenu1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clinical Menu 1</h2>
            <p className="text-gray-600">Clinical protocols and procedures</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Clinical subpage 1</strong>. Manage clinical protocols, 
            treatment templates, and medical procedures.
          </p>
        </div>
      </div>
    </div>
  );
};