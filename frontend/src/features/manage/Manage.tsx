import React from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { FolderCog } from 'lucide-react';

export const Manage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <FolderCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage</h1>
              <p className="text-sm text-gray-600">System management and administrative tools</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderCog className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                This is the Manage Page
              </h2>
              <p className="text-gray-600 mb-4">
                System management, user administration, and practice configuration tools.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                Admin Only - Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};