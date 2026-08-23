import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Letter } from '@/features/clinical-documentation/api/letters.api';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { sendLetterEmail } from '@/features/clinical-documentation/api/letters.api';
import { getPractitioners } from '@/features/clinics/clinic.api';
import { getContacts } from '@/features/contacts/contact.api';
import axiosInstance from '@/lib/axios';

interface EmailSuggestion {
  name: string;
  email: string;
  role: string;
}

interface SendLetterEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: Letter;
  patientName: string;
  patientEmail: string;
}

export const SendLetterEmailModal: React.FC<SendLetterEmailModalProps> = ({
  isOpen,
  onClose,
  letter,
  patientName,
  patientEmail,
}) => {
  const [emails, setEmails] = useState<string[]>(
    patientEmail && patientEmail.trim() !== '' ? [patientEmail] : []
  );
  const [emailInput, setEmailInput] = useState('');
  const [subject, setSubject] = useState(letter.subject || `Clinical Letter`);
  const [body, setBody] = useState(
    `Dear ${patientName},\n\n` +
    `Please find attached your clinical letter.\n\n` +
    `If you have any questions, please don't hesitate to contact us.\n\n` +
    `Best regards,\n` +
    `Clinic Team`
  );
  
  const { emailEnabled } = useClinicSettings();

  // Email suggestions state
  const [allSuggestions, setAllSuggestions] = useState<EmailSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<EmailSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch email suggestions on modal open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchEmailSuggestions = async () => {
      try {
        const practitionersData = await getPractitioners();
        const practitionerSuggestions = practitionersData.practitioners.map(p => ({
          name: p.name,
          email: p.email,
          role: p.role || 'PRACTITIONER',
        }));

        interface User {
          email: string;
          first_name: string;
          last_name: string;
          role: string;
        }
        const usersResponse = await axiosInstance.get('/users/');
        const users = usersResponse.data.results || usersResponse.data;
        const userSuggestions = (users as User[])
          .filter((u: User) => u.email && (u.role === 'STAFF' || u.role === 'ADMIN'))
          .map((u: User) => ({
            name: `${u.first_name} ${u.last_name}`,
            email: u.email,
            role: u.role,
          }));

        const contactsData = await getContacts({ is_active: true, page_size: 100 });
        const contactSuggestions = contactsData.results
          .filter((c) => c.email)
          .map((c) => ({
            name: c.full_name,
            email: c.email!,
            role: c.contact_type_display,
          }));

        const combined = [...practitionerSuggestions, ...userSuggestions, ...contactSuggestions];
        const uniqueSuggestions = Array.from(
          new Map(combined.map(s => [s.email, s])).values()
        );

        if (!cancelled) setAllSuggestions(uniqueSuggestions);
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch email suggestions:', err);
      }
    };
    fetchEmailSuggestions();
    return () => { cancelled = true; };
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

  const handleSuggestionSelect = (suggestion: EmailSuggestion) => {
    if (!emails.includes(suggestion.email)) {
      setEmails([...emails, suggestion.email]);
    }
    setEmailInput('');
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    emailInputRef.current?.focus();
  };

  const handleAddEmail = (emailToAdd: string = emailInput) => {
    const trimmed = emailToAdd.trim().toLowerCase();
    if (trimmed && trimmed.includes('@') && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleSend = () => {
    if (emails.length === 0) {
      toast.error('Please add at least one recipient email address.');
      return;
    }

    const formData = new FormData();
    formData.append('to', emails.join(','));
    formData.append('subject', subject);
    formData.append('body', body);
    
    // No attachment appended here because we updated the backend to fallback to the letter.rendered_pdf automatically!

    const sendPromise = sendLetterEmail(letter.id, formData);

    toast.promise(sendPromise, {
      loading: 'Sending letter email...',
      success: 'Email sent successfully!',
      error: 'Failed to send email. Please try again.',
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Send Clinical Letter via Email</h2>
              <p className="text-sm text-gray-500">Patient: {patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {!emailEnabled && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Email sending is disabled</p>
                <p className="mt-1">Please enable it in Clinic Settings to send emails.</p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* To: Recipients */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">To <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="min-h-[42px] p-1.5 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 bg-white flex flex-wrap gap-2 items-center">
                  {emails.map(email => (
                    <span key={email} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-sm border border-sky-100">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="hover:text-sky-900 hover:bg-sky-200/50 p-0.5 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={emailInput}
                    onChange={(e) => handleEmailInput(e.target.value)}
                    onFocus={() => emailInput.length > 0 && setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddEmail();
                      } else if (e.key === 'Backspace' && !emailInput && emails.length > 0) {
                        handleRemoveEmail(emails[emails.length - 1]);
                      }
                    }}
                    onBlur={() => { 
                      setTimeout(() => {
                        if (emailInput) handleAddEmail();
                      }, 200);
                    }}
                    placeholder={emails.length === 0 ? "Add email address..." : ""}
                    className="flex-1 min-w-[200px] bg-transparent border-none p-1 text-sm text-gray-900 focus:ring-0 placeholder:text-gray-400"
                  />
                </div>
                
                {/* Email Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden"
                  >
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.email}-${index}`}
                        type="button"
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="flex flex-col min-w-0 pr-4">
                          <span className="font-medium text-gray-900 text-sm truncate">{suggestion.name}</span>
                          <span className="text-gray-500 text-sm truncate">{suggestion.email}</span>
                        </div>
                        <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-md shrink-0 border border-sky-100">
                          {suggestion.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                placeholder="Email subject..."
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white resize-none"
                placeholder="Write your message here..."
              />
            </div>
            
            {/* Attachment info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.362 2c4.156 0 2.638 6 2.638 6s6-1.65 6 2.457v11.543h-16v-20h7.362zm.827-2h-10.189v24h20v-14.386c0-2.391-6.648-9.614-9.811-9.614zm4.811 13h-10v-1h10v1zm0 2h-10v1h10v-1zm0 3h-10v-1h10v1z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Clinical Letter PDF</p>
                  <p className="text-xs text-gray-500">Auto-generated attachment</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={emails.length === 0 || !emailEnabled}
            className="px-5 py-2.5 text-sm font-medium text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
};
