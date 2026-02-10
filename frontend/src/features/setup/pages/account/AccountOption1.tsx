import React from 'react';
import { CreditCard } from 'lucide-react';

export const AccountOption1: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Account Option 1</h2>
            <p className="text-gray-600">Billing and subscription management</p>
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="text-gray-700">
            This is <strong>Account Option 1</strong> subpage. Manage your subscription,
            billing information, and payment methods.
          </p>
        </div>
      </div>
    </div>
  );
};