import React from 'react';
import { Puzzle } from 'lucide-react';

export const ExtensionsOption1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-pink-100 rounded-xl flex items-center justify-center">
            <Puzzle className="w-8 h-8 text-pink-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Extensions Option 1</h2>
            <p className="text-gray-600">Browse and install extensions</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Extensions Option 1</strong> subpage. Discover and install
            new extensions to enhance your practice management system.
          </p>
        </div>
      </div>
    </div>
  );
};