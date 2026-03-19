import React from 'react';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

type InnerStep = 'practitioner' | 'services' | 'details';

interface PortalFooterActionsProps {
  step:        InnerStep;
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
  const isSubmit = step === 'details';

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200">

      {/* Back — always visible inside inner flow; goes back or returns to branch picker */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {step === 'practitioner' ? 'Change Location' : 'Back'}
      </button>

      {/* Continue / Submit */}
      {isSubmit ? (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</>
          ) : (
            <><CheckCircle className="w-4 h-4" />Confirm Booking</>
          )}
        </button>
      ) : step === 'services' ? (
        <span className="text-xs text-gray-400 italic">
          Pick a date &amp; time above to continue
        </span>
      ) : (
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};