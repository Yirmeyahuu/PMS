import React from 'react';
import { X, FileSignature } from 'lucide-react';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'CONSENT_FORM') => void;
}

const DOCUMENT_OPTIONS = [
  {
    type: 'CONSENT_FORM' as const,
    label: 'Data Privacy Consent Form',
    description: 'Legally required patient consent for data collection and treatment operations.',
    icon: FileSignature,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200 hover:border-sky-400',
  },
];

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Add Document</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {DOCUMENT_OPTIONS.map(({ type, label, description, icon: Icon, color, bg, border }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onClose();
                onSelect(type);
              }}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border ${border} transition-colors text-left`}
            >
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{label}</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400">
            More document types may be added in future updates.
          </p>
        </div>
      </div>
    </div>
  );
};
