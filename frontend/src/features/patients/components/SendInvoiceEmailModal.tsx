import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { getClinicEmailRecipients, type ClinicEmailRecipient } from '@/features/clinics/clinic.api';

interface SendInvoiceEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentType: string;
}

export const SendInvoiceEmailModal: React.FC<SendInvoiceEmailModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  patientName,
  patientEmail,
  appointmentDate,
  appointmentType,
}) => {
  const [emails, setEmails] = useState<string[]>(
    patientEmail && patientEmail.trim() !== '' ? [patientEmail] : []
  );
  const [emailInput, setEmailInput] = useState('');
  const [subject, setSubject] = useState(`Invoice #${invoiceNumber} - Appointment Invoice`);
  const [body, setBody] = useState(
    `Dear ${patientName},\n\n` +
    `Thank you for your visit. Please find attached your invoice for the ${appointmentType} appointment on ${appointmentDate}.\n\n` +
    `Invoice Number: ${invoiceNumber}\n` +
    `If you have any questions, please don't hesitate to contact us.\n\n` +
    `Best regards,\n` +
    `Clinic Team`
  );
  const { emailEnabled } = useClinicSettings();

  // Email suggestions state
  const [allSuggestions, setAllSuggestions] = useState<ClinicEmailRecipient[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<ClinicEmailRecipient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch email suggestions on modal open
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const fetchEmailSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const recipients = await getClinicEmailRecipients();

        if (!cancelled) {
          setAllSuggestions(recipients);
          setFilteredSuggestions(recipients);
        }
      } catch (err) {
        // Silently fail - suggestions are optional
        if (!cancelled) console.error('Failed to fetch email suggestions:', err);
      } finally {
        if (!cancelled) setIsLoadingSuggestions(false);
      }
    };

    fetchEmailSuggestions();

  }, [isOpen]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        emailInputRef.current && !emailInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmailInput = (value: string) => {
    setEmailInput(value);

    // Check if user pressed space to add email
    if (value.endsWith(' ')) {
      const emailToAdd = value.trim();
      if (emailToAdd && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAdd) && !emails.includes(emailToAdd)) {
        setEmails([...emails, emailToAdd]);
        setEmailInput('');
        setShowSuggestions(false);
      } else if (!emailToAdd) {
        setEmailInput('');
      }
      return;
    }

    // Filter suggestions as user types
    if (value.length > 0) {
      const filtered = allSuggestions.filter(s =>
        s.email.toLowerCase().includes(value.toLowerCase()) ||
        s.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
    }
  };

  const handleSuggestionSelect = (suggestion: ClinicEmailRecipient) => {
    if (!emails.includes(suggestion.email)) {
      setEmails([...emails, suggestion.email]);
    }
    setEmailInput('');
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    emailInputRef.current?.focus();
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleSend = () => {
    if (emails.length === 0) {
      toast.error('Please enter at least one recipient email address');
      return;
    }

    const token = localStorage.getItem('access_token');

    // Join emails with comma (no spaces) for backend
    const emailsToSend = emails.join(',');

    const formData = new FormData();
    formData.append('to_email', emailsToSend);
    formData.append('subject', subject);
    formData.append('body', body);

    const sendPromise = fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}/invoices/${invoiceId}/send-email/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    ).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email');
      }
      return response.json();
    });

    toast.promise(sendPromise, {
      loading: 'Sending invoice email...',
      success: 'Invoice sent successfully!',
      error: (err) => err.message || 'Failed to send invoice email.',
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Send Invoice Email</h2>
                <p className="text-xs text-gray-500">Invoice #{invoiceNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Email notifications disabled warning */}
            {!emailEnabled && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Email notifications are currently disabled in Clinic Settings. Enable Email Notifications to send emails.
                </p>
              </div>
            )}

            {/* To Email */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                To <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus-within:outline-none focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent bg-white flex flex-wrap gap-2 items-center">
                  {/* Email Chips */}
                  {emails.map((email, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-700 rounded-lg text-xs font-medium"
                    >
                      <span className="truncate">{email}</span>
                      <button
                        onClick={() => removeEmail(email)}
                        className="ml-0.5 hover:bg-sky-200 rounded p-0.5 transition-colors"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Input for new email */}
                  <input
                    ref={emailInputRef}
                    type="text"
                    value={emailInput}
                    onChange={(e) => handleEmailInput(e.target.value)}
                    onFocus={() => emailInput.length > 0 && setShowSuggestions(true)}
                    placeholder={emails.length === 0 ? "patient@example.com" : "Add more emails..."}
                    className="flex-1 min-w-[150px] outline-none bg-transparent text-sm"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {showSuggestions && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
                  >
                    {isLoadingSuggestions ? (
                      <div className="p-3 text-sm text-gray-500 text-center">Loading recipients...</div>
                    ) : filteredSuggestions.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">No matching recipients found.</div>
                    ) : (
                      filteredSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="w-full flex items-start gap-2 px-3 py-2 hover:bg-sky-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                          type="button"
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            {suggestion.avatarUrl ? (
                              <img src={suggestion.avatarUrl} alt={suggestion.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gray-100" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {suggestion.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{suggestion.name}</p>
                              <p className="text-xs text-gray-500 truncate">{suggestion.email}</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded whitespace-nowrap ml-2">
                            {suggestion.role}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={emails.length === 0 || !emailEnabled}
              className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:hover:bg-sky-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Send Invoice
            </button>
          </div>
        </div>
      </div>
    </>
  );
};