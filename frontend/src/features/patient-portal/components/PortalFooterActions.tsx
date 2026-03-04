import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

type Step = 'practitioner' | 'services' | 'datetime' | 'details';

interface PortalFooterActionsProps {
  step:        Step;
  canContinue: boolean;
  submitting:  boolean;
  onBack:      () => void;
  onContinue:  () => void;
  onSubmit:    () => void;
}

export const PortalFooterActions: React.FC<PortalFooterActionsProps> = ({
  step,
  canContinue,
  submitting,
  onBack,
  onContinue,
  onSubmit,
}) => {
  const isFirst = step === 'practitioner';
  const isLast  = step === 'details';

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 bg-white">
      {/* Back */}
      <button
        onClick={onBack}
        disabled={isFirst}
        className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Right-side hint or action */}
      {!isLast ? (
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step === 'datetime' ? 'Continue' : 'Next'}
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Confirm Booking
        </button>
      )}
    </div>
  );
};