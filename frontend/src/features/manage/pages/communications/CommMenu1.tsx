import React from 'react';
import { Mail } from 'lucide-react';

export const CommMenu1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
            <Mail className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Communications Menu 1</h2>
            <p className="text-gray-600">Email and messaging configuration</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Communications subpage 1</strong>. Configure email templates, 
            SMS notifications, and messaging systems.
          </p>
        </div>
      </div>
    </div>
  );
};