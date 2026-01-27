import React from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Settings } from 'lucide-react';

export const Setup: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Setup</h1>
              <p className="text-sm text-gray-600">Initial practice setup and configuration</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-10 h-10 text-pink-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                This is the Setup Page
              </h2>
              <p className="text-gray-600 mb-4">
                Initial practice setup wizard, configuration, and onboarding tools.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-lg text-sm text-pink-700">
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
                Admin Only - Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};