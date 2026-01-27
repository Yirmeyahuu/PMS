import React from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile</h1>
              <p className="text-sm text-gray-600">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
              {/* User Info Card */}
              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
                <div className="w-20 h-20 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-2xl">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="mt-2 inline-flex items-center px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">
                    {user?.role}
                  </div>
                </div>
              </div>

              {/* Coming Soon */}
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-sky-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Profile Settings Coming Soon
                </h3>
                <p className="text-gray-600 mb-4">
                  Update your personal information, change password, and manage preferences.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-lg text-sm text-sky-700">
                  <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};