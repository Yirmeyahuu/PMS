import React from 'react';
import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 mb-6">
          You do not have permission to access this page.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
