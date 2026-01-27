import React from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Calendar as CalendarIcon } from 'lucide-react';

export const Diary: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Diary</h1>
              <p className="text-sm text-gray-600">Appointment scheduling and calendar view</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center">
              <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-10 h-10 text-sky-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                This is the Diary Page
              </h2>
              <p className="text-gray-600 mb-4">
                Appointment diary and scheduling functionality will be implemented here.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-lg text-sm text-sky-700">
                <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};