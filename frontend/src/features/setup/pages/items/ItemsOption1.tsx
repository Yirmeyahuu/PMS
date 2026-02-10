import React from 'react';
import { Package } from 'lucide-react';

export const ItemsOption1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
            <Package className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Items Option 1</h2>
            <p className="text-gray-600">Manage service items and products</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Items Option 1</strong> subpage. Configure services, products,
            and treatment items available in your practice.
          </p>
        </div>
      </div>
    </div>
  );
};