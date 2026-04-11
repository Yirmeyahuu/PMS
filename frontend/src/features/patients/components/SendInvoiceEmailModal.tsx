import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { PMSInvoiceTemplate } from '@/components/invoices/PMSInvoiceTemplate';
import type { InvoiceClinicInfo, NextAppointmentInfo } from '@/components/invoices/PMSInvoiceTemplate';
import type { Invoice } from '@/types/billing';
import { useClinicSettings } from '@/hooks/useClinicSettings';

interface SendInvoiceEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentType: string;
  invoice?: Invoice;
  clinic?: InvoiceClinicInfo;
  nextAppointment?: NextAppointmentInfo | null;
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
  invoice,
  clinic,
  nextAppointment,
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { emailEnabled } = useClinicSettings();

  // Auto-generate PDF from PMSInvoiceTemplate on mount
  const generatePdf = useCallback(async () => {
    if (!invoice) return;
    setIsGeneratingPdf(true);
    try {
      // A4 dimensions at 96 DPI
      const A4_WIDTH_PX = 794;  // 210mm
      const A4_HEIGHT_PX = 1122; // 297mm

      // Create an offscreen container at exact A4 width
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

      // Render the template into the offscreen container
      const root = createRoot(container);
      await new Promise<void>((resolve) => {
        root.render(
          <PMSInvoiceTemplate
            invoice={invoice}
            clinic={clinic}
            showPaymentHistory={true}
            nextAppointment={nextAppointment}
            className="!max-w-none"
          />
        );
        // Wait for render + images to load
        setTimeout(resolve, 1000);
      });

      // Force the inner template to fill the full container width
      const templateEl = container.firstElementChild as HTMLElement;
      if (templateEl) {
        templateEl.style.maxWidth = 'none';
        templateEl.style.width = '100%';
      }

      // Capture to canvas at exact A4 width
      const captureHeight = Math.max(container.scrollHeight, A4_HEIGHT_PX);
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: A4_WIDTH_PX,
        height: captureHeight,
        windowWidth: A4_WIDTH_PX,
      });

      // Convert to PDF — always fill full A4 width
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content exceeds one page, scale to fit single page
      const maxHeight = 297;
      if (pdfHeight > maxHeight) {
        // Scale to fit height, but always stretch to full width
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, maxHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      // Convert to File
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `Invoice_${invoiceNumber}.pdf`, {
        type: 'application/pdf',
      });

      setAttachment(pdfFile);

      // Cleanup
      root.unmount();
      document.body.removeChild(container);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setErrorMessage('Failed to auto-generate invoice PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [invoice, clinic, nextAppointment, invoiceNumber]);

  useEffect(() => {
    if (isOpen && invoice) {
      generatePdf();
    }
  }, [isOpen, invoice, generatePdf]);

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

            {/* Auto-generated PDF Attachment */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600">Attachment</label>
              
              {isGeneratingPdf && (
                <div className="flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />
                  <span className="text-sm text-sky-700">Generating invoice PDF...</span>
                </div>
              )}

              {!isGeneratingPdf && attachment && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-green-700 truncate">{attachment.name}</span>
                  <span className="text-xs text-green-500 flex-shrink-0">
                    ({(attachment.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}

              {!isGeneratingPdf && !attachment && !invoice && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-sm text-amber-700">Invoice data not available for PDF generation.</span>
                </div>
              )}
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
              disabled={isSending || isGeneratingPdf || !emailEnabled}
              title={!emailEnabled ? 'Email notifications are currently disabled in Clinic Settings.' : undefined}
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