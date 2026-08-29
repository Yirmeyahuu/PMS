import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmReplaceModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmReplaceModal: React.FC<ConfirmReplaceModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-md p-6 shadow-xl w-full max-w-md">
        <p className="text-gray-900 text-lg mb-6">
          A draft note already exists for this session. Do you want to replace it with this new note?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-transparent text-black border border-black hover:bg-gray-100 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800 font-medium transition-colors"
          >
            Replace
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
