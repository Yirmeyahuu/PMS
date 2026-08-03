import React, { useState } from 'react';
import { Headphones } from 'lucide-react';
import { UserFeedbackModal } from './UserFeedbackModal';
import { useLocation } from 'react-router-dom';

export const FloatingSupportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Auto-detect module based on current URL path
  const detectModule = (): string => {
    const path = location.pathname.toLowerCase();
    
    if (path.includes('/dashboard')) return 'DASHBOARD';
    if (path.includes('/diary')) return 'DIARY';
    if (path.includes('/patients')) {
      if (path.includes('/cases')) return 'CASES';
      if (path.includes('/clinical-documentation')) return 'CLINICAL_DOCUMENTATION';
      if (path.includes('/notes')) return 'CLINICAL_NOTES';
      if (path.includes('/letters')) return 'LETTERS';
      return 'PATIENTS';
    }
    if (path.includes('/appointments')) return 'APPOINTMENTS';
    if (path.includes('/invoices') || path.includes('/billing')) return 'BILLING';
    if (path.includes('/reports')) return 'REPORTS';
    if (path.includes('/setup') || path.includes('/settings')) return 'SETUP';
    if (path.includes('/services')) return 'SERVICES';
    if (path.includes('/packages')) return 'SESSION_PACKAGES';
    if (path.includes('/sms')) return 'SMS';
    
    return 'OTHER';
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          {/* Tooltip */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
            Customer Service
            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-l-[5px] border-l-gray-800 border-b-4 border-b-transparent"></div>
          </div>
          
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Customer Service and Feedback"
            className="flex items-center justify-center w-14 h-14 bg-primary-gradient text-white rounded-full shadow-lg hover:shadow-xl hover:opacity-90 hover:-translate-y-1 transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          >
            <Headphones className="w-6 h-6" />
          </button>
        </div>
      </div>

      <UserFeedbackModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        defaultModule={detectModule()}
      />
    </>
  );
};
