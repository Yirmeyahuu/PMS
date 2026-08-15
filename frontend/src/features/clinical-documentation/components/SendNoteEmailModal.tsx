import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Mail, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { ClinicalNotePrintTemplate } from './ClinicalNotePrintTemplate';
import type { ClinicalNote, ClinicalTemplate } from '@/types/clinicalTemplate';
import type { Appointment } from '@/types';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { sendClinicalNoteEmail } from '@/features/clinical-template/clinical-templates.api';
import { getPractitioners } from '@/features/clinics/clinic.api';
import { getContacts } from '@/features/contacts/contact.api';
import axiosInstance from '@/lib/axios';

interface EmailSuggestion {
  name: string;
  email: string;
  role: string;
}

interface SendNoteEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: ClinicalNote;
  template: ClinicalTemplate | null;
  appointment?: Appointment | null;
  patientName: string;
  patientEmail: string;
  clinicName?: string;
  clinicLogoUrl?: string;
}

export const SendNoteEmailModal: React.FC<SendNoteEmailModalProps> = ({
  isOpen,
  onClose,
  note,
  template,
  appointment,
  patientName,
  patientEmail,
  clinicName,
  clinicLogoUrl,
}) => {
  const noteDate = note.date ? new Date(note.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const [emails, setEmails] = useState<string[]>(
    patientEmail && patientEmail.trim() !== '' ? [patientEmail] : []
  );
  const [emailInput, setEmailInput] = useState('');
  const [subject, setSubject] = useState(`Clinical Note – ${noteDate}`);
  const [body, setBody] = useState(
    `Dear ${patientName},\n\n` +
    `Please find attached your clinical note from your recent appointment on ${noteDate}.\n\n` +
    `If you have any questions, please don't hesitate to contact us.\n\n` +
    `Best regards,\n` +
    `Clinic Team`
  );
  
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { emailEnabled } = useClinicSettings();

  // Email suggestions state
  const [allSuggestions, setAllSuggestions] = useState<EmailSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<EmailSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const generatePdf = useCallback(async () => {
    if (!note) return;
    setIsGeneratingPdf(true);
    try {
      // A4 dimensions at 96 DPI
      const A4_WIDTH_PX = 794;
      const A4_HEIGHT_PX = 1122;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = `${A4_WIDTH_PX}px`;
      container.style.minHeight = `${A4_HEIGHT_PX}px`;
      container.style.background = 'white';
      container.style.zIndex = '-1';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      const root = createRoot(container);
      await new Promise<void>((resolve) => {
        root.render(
            <ClinicalNotePrintTemplate
              note={note}
              template={template}
              appointment={appointment}
              patientName={patientName}
              clinicName={clinicName}
              clinicLogoUrl={clinicLogoUrl}
              className="!max-w-none"
            />
        );
        setTimeout(resolve, 1000); // Wait for render
      });

      const templateEl = container.firstElementChild as HTMLElement;
      if (templateEl) {
        templateEl.style.maxWidth = 'none';
        templateEl.style.width = '100%';
      }

      const captureHeight = Math.max(container.scrollHeight, A4_HEIGHT_PX);
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: A4_WIDTH_PX,
        height: captureHeight,
        windowWidth: A4_WIDTH_PX,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const maxHeight = 297;
      if (pdfHeight > maxHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, maxHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const pdfBlob = pdf.output('blob');
      const patientSlug = patientName.replace(/ /g, '-').toLowerCase();
      const pdfFile = new File([pdfBlob], `ClinicalNote_${patientSlug}.pdf`, {
        type: 'application/pdf',
      });

      setAttachment(pdfFile);

      root.unmount();
      document.body.removeChild(container);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setErrorMessage('Failed to generate PDF attachment.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [note, template, appointment, patientName]);

  // Auto-generate PDF on mount
  useEffect(() => {
    if (isOpen && !attachment && !isGeneratingPdf) {
      generatePdf();
    }
  }, [isOpen, attachment, isGeneratingPdf, generatePdf]);

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
    if (!attachment) {
      toast.error('PDF attachment is still generating. Please wait.');
      return;
    }

    const sendPromise = sendClinicalNoteEmail(note.id, {
      to: emails.join(','),
      subject,
      body,
      attachment
    });

    toast.promise(sendPromise, {
      loading: 'Sending Note email...',
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
              <h2 className="text-lg font-bold text-gray-900">Send Clinical Note via Email</h2>
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
                      // Need slight delay to allow suggestion click to register
                      setTimeout(() => {
                        if (emailInput) handleAddEmail();
                      }, 200);
                    }}
                    placeholder={emails.length === 0 ? "Add email address..." : ""}
                    className="flex-1 min-w-[200px] bg-transparent border-none p-1 text-sm text-gray-900 focus:ring-0 placeholder:text-gray-400"
                  />
                </div>
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
                  >
                    {filteredSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-sky-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                        type="button"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{suggestion.name}</p>
                          <p className="text-xs text-gray-500 truncate">{suggestion.email}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded whitespace-nowrap ml-2">
                          {suggestion.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Press Enter, Space, or comma to add multiple recipients</p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none font-sans"
              />
            </div>

            {/* Attachment Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Attachment</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    ClinicalNote_{patientName.replace(/ /g, '-')}.pdf
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isGeneratingPdf ? (
                      <span className="flex items-center gap-1.5 text-sky-600">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
                      </span>
                    ) : attachment ? (
                      `${(attachment.size / 1024).toFixed(1)} KB`
                    ) : (
                      'Failed to generate PDF'
                    )}
                  </p>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!emailEnabled || emails.length === 0 || isGeneratingPdf || !attachment}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-sky-600/20"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
};
