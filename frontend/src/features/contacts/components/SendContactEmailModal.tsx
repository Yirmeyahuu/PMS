import React, { useState, useEffect } from 'react';
import { X, Send, RefreshCw, AlertCircle, Mail } from 'lucide-react';
import type { Contact } from '@/types';
import { sendContactEmail } from '../contact.api';
import toast from 'react-hot-toast';

interface SendContactEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  clinicName?: string;
  clinicAddress?: string;
}

export const SendContactEmailModal: React.FC<SendContactEmailModalProps> = ({
  isOpen,
  onClose,
  contact,
  clinicName = 'Clinic Name',
  clinicAddress = '',
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !contact) return null;

  const maxChars = 3000;
  const remainingChars = maxChars - message.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    if (message.length > maxChars) {
      setError(`Message cannot exceed ${maxChars} characters`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendContactEmail(contact.id, message);
      toast.success('Email sent successfully');
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to send email';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="h-1.5 w-full bg-sky-500 rounded-t-2xl" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-sm">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Send Email</h2>
                <p className="text-xs text-gray-400">
                  To: {contact.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Header - Clinic Info */}
          <div className="bg-sky-500 px-6 py-4 text-white">
            <div className="text-center">
              <h3 className="text-lg font-bold">{clinicName}</h3>
              {clinicAddress && (
                <p className="text-sm opacity-90 mt-1">{clinicAddress}</p>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4">
              {/* Message Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your message to the contact..."
                  rows={10}
                  maxLength={maxChars + 100}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${remainingChars < 100 ? 'text-red-500' : 'text-gray-400'}`}>
                    {remainingChars} / {maxChars} characters remaining
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 italic">
                  Yours Truly,
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-sm font-semibold"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
