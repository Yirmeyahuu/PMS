import React, { useState, useRef } from 'react';
import { X, Mail, Loader2, FileText, Download, Paperclip, Trash2 } from 'lucide-react';

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
  const [toEmail, setToEmail] = useState(patientEmail);
  const [subject, setSubject] = useState(`Invoice #${invoiceNumber} - Appointment Invoice`);
  const [body, setBody] = useState(
    `Dear ${patientName},\n\n` +
    `Thank you for your visit. Please find attached your invoice for the ${appointmentType} appointment on ${appointmentDate}.\n\n` +
    `Invoice Number: ${invoiceNumber}\n` +
    `If you have any questions, please don't hesitate to contact us.\n\n` +
    `Best regards,\n` +
    `Clinic Team`
  );
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadInvoice = () => {
    const token = localStorage.getItem('access_token');
    const printUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}/invoices/${invoiceId}/print/?token=${token}`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  const handleSend = async () => {
    if (!toEmail.trim()) {
      setErrorMessage('Please enter a recipient email address');
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('access_token');
      
      const formData = new FormData();
      formData.append('to_email', toEmail);
      formData.append('subject', subject);
      formData.append('body', body);

      // If user attached a file, include it
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}/invoices/${invoiceId}/send-email/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email');
      }

      setSuccessMessage('Invoice sent successfully!');
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
        setAttachment(null);
      }, 2000);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden"
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
          <div className="p-6 space-y-4">
            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {/* To Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                To <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
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

            {/* File Attachment Section */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-600">Attachment</label>
              
              {/* Current Attachment */}
              {attachment && (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveAttachment}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Attachment Buttons */}
              <div className="flex gap-2">
                {/* Download PDF Button */}
                <button
                  onClick={handleDownloadInvoice}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>

                {/* Attach File Button */}
                <button
                  onClick={handleAttachFile}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach File
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
              
              <p className="text-xs text-gray-400">
                Tip: Download the PDF first, then click "Attach File" to attach it to the email.
              </p>
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
              disabled={isSending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};