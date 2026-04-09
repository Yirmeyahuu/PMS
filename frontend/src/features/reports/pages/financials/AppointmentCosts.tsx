import React from 'react';
import { DollarSign } from 'lucide-react';

export const AppointmentCosts: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-200">
          <DollarSign className="w-8 h-8 text-teal-500" />
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Appointment Costs Report</p>
        <p className="text-xs text-gray-500 max-w-xs">
          This report is coming soon. It will display cost breakdowns for appointments using
          invoice data — including appointment type, practitioner, date, and totals.
        </p>
      </div>
    </div>
  );
};
