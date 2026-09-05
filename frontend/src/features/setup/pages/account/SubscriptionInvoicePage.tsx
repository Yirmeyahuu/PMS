import React, { useEffect } from 'react';
import { CreditCard, ArrowLeft, Loader2, FileText, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { MONTHLY_PLAN_PRICE, formatDateTime } from './subscription.utils';
import MalasakitLogo from '@/assets/malasakit/PrimaryLogo-Colored.png';

export const SubscriptionInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { subscription, isLoading, startCheckout, isStartingCheckout } = useSubscription();

  // If subscription is actually active, we can just redirect them back
  useEffect(() => {
    if (subscription && subscription.status === 'ACTIVE') {
      const expiresAt = Date.parse(subscription.end_date);
      if (!Number.isNaN(expiresAt) && expiresAt >= Date.now()) {
        navigate('/setup?card=account&option=subscription', { replace: true });
      }
    }
  }, [subscription, navigate]);

  if (isLoading || !subscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading invoice...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden relative">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary-gradient"></div>
          
          {/* Header */}
          <div className="bg-black px-6 py-8 sm:px-8 pt-10">
            <div className="flex items-center gap-4 text-white mb-2">
              <FileText className="w-8 h-8 opacity-80" />
              <h1 className="text-2xl font-bold">Subscription Invoice</h1>
            </div>
            <p className="text-gray-300 text-sm">
              Your Malasakit Practice Management System subscription has ended.
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-8 sm:px-8 space-y-8">
            {/* Status and Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Status</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-none text-xs font-semibold bg-red-100 text-red-800">
                  OVERDUE / UNPAID
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Plan</p>
                <p className="text-sm font-medium text-gray-900">Malasakit Monthly Plan</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Expired On</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-900">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDateTime(subscription.end_date)}
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Line Items */}
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-4 text-gray-900">
                      Malasakit Subscription (30 days)
                    </td>
                    <td className="py-4 text-right text-gray-900 tabular-nums">
                      PHP {MONTHLY_PLAN_PRICE}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-4 text-right font-bold text-gray-900 text-base">Total Due</td>
                    <td className="pt-4 text-right font-bold text-black text-xl tabular-nums">
                      PHP {MONTHLY_PLAN_PRICE}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Action */}
            <div className="bg-gray-50 rounded-none p-5 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Secure Payment via PayMongo</p>
                <p className="text-xs text-gray-600 mt-0.5">Pay with GCash, PayMaya, or Credit/Debit Card.</p>
              </div>
              <button
                onClick={() => startCheckout()}
                disabled={isStartingCheckout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-black rounded-none hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isStartingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay PHP {MONTHLY_PLAN_PRICE}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Logo */}
        <div className="mt-8 flex justify-center">
          <img src={MalasakitLogo} alt="Malasakit Logo" className="h-8 object-contain opacity-80" />
        </div>
      </div>
    </div>
  );
};
