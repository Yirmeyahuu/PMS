import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscriptionAccess } from '../../hooks/useSubscriptionAccess';
import MalasakitLogo from '@/assets/malasakit/PrimaryLogo-Colored.png';

export const SubscriptionEndedModal: React.FC = () => {
  const { isSubscriptionActive, isSubscriptionLoading, subscription } = useSubscriptionAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If still loading or no subscription data, do nothing
    if (isSubscriptionLoading || !subscription) return;

    // If subscription is active or user is on the invoice page, ensure modal is closed and stop timers
    if (isSubscriptionActive || location.pathname === '/setup/subscription/invoice') {
      setIsOpen(false);
      setHasClosed(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // If subscription is inactive and hasn't been closed, open it immediately
    if (!hasClosed) {
      setIsOpen(true);
    } else {
      // If user closed it, wait 5 seconds then reopen
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsOpen(true);
        setHasClosed(false); // Reset so it stays open
      }, 1000);
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSubscriptionActive, isSubscriptionLoading, subscription, hasClosed, location.pathname]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[99998]" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4">
        <div className="bg-white shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="flex justify-center pt-6 pb-6 bg-red-50">
            <img src={MalasakitLogo} alt="Malasakit Logo" className="h-10 object-contain" />
          </div>
          <div className="bg-red-50 px-5 pb-5 flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Subscription Ended</h2>
              <p className="text-sm text-gray-700">
                Your Malasakit subscription has ended. You can still view your existing records, but creating, editing, deleting, or performing operational tasks is currently unavailable.
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-3">
                Please settle your subscription invoice to restore full access.
              </p>
            </div>
          </div>

          <div className="p-5 bg-white flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                setHasClosed(true);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-hidden transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setHasClosed(true);
                navigate('/setup/subscription/invoice');
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-black hover:bg-gray-800 transition-colors focus:outline-hidden"
            >
              <CreditCard className="w-4 h-4" />
              Pay Invoice
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
