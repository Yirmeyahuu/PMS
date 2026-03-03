import React from 'react';

type Step = 'services' | 'datetime' | 'details';

interface PortalFooterActionsProps {
  step:          Step;
  canContinue:   boolean;
  submitting:    boolean;
  onBack:        () => void;
  onContinue:    () => void;
  onSubmit:      () => void;
}

export const PortalFooterActions: React.FC<PortalFooterActionsProps> = ({
  step,
  canContinue,
  submitting,
  onBack,
  onContinue,
  onSubmit,
}) => {
  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
      {/* Back */}
      <button
        onClick={onBack}
        disabled={step === 'services'}
        className="px-8 py-3 bg-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Back
      </button>

      {/* Right-side action */}
      {step === 'services' && (
        <span className="text-sm text-gray-400">Select a service to continue</span>
      )}

      {step === 'datetime' && (
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="px-8 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start
        </button>
      )}

      {step === 'details' && (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-8 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Confirm Booking
        </button>
      )}
    </div>
  );
};