import React from 'react';
import { Download } from 'lucide-react';

export const ExtensionsOption3: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-lime-100 rounded-xl flex items-center justify-center">
            <Download className="w-8 h-8 text-lime-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Extensions Option 3</h2>
            <p className="text-gray-600">Extension updates and marketplace</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Extensions Option 3</strong> subpage. Check for updates and
            browse the extension marketplace for new features.
          </p>
        </div>
      </div>
    </div>
  );
};