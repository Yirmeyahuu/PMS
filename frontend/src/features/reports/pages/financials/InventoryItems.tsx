import React from 'react';
import { Package } from 'lucide-react';

export const InventoryItems: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200">
          <Package className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Inventory Items Report</p>
        <p className="text-xs text-gray-500 max-w-xs">
          This report is coming soon. It will display clinic inventory items, quantities, unit
          prices, and total values.
        </p>
      </div>
    </div>
  );
};
