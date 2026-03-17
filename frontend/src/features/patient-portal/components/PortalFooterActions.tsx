import React from 'react';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

type Step = 'practitioner' | 'services' | 'details';

interface PortalFooterActionsProps {
  step:         Step;
  canContinue:  boolean;
  submitting:   boolean;
  onBack:       () => void;
  onContinue:   () => void;
  onSubmit:     () => void;
}

export const PortalFooterActions: React.FC<PortalFooterActionsProps> = ({
  step,
  canContinue,
  submitting,
  onBack,
  onContinue,
  onSubmit,
}) => {
  const isFirst  = step === 'practitioner';
  const isLast   = step === 'details';
  // On 'services' step, progression is handled by inline calendar — no Continue button
  const isMiddle = step === 'services';

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
      {/* Back */}
      <button
        onClick={onBack}
        disabled={isFirst}
        className={`
          inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors
          ${isFirst
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }
        `}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Continue / Submit */}
      {isLast ? (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Confirm Booking'}
        </button>
      ) : isMiddle ? (
        // Services step: inline calendar handles progression — show a hint instead
        <p className="text-xs text-gray-400 italic">
          Select a service and pick a date &amp; time above to continue
        </p>
      ) : (
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};