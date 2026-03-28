import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Clock, CheckCircle, XCircle, AlertCircle, Activity,
  Calendar, User, MapPin, FileText, Receipt,
  ChevronDown, ChevronUp, Loader2,
  ClipboardList, Printer, Mail,
} from 'lucide-react';
import type { Appointment } from '@/types';
import { getAppointmentInvoice } from '@/features/appointments/appointment.api';
import { SendInvoiceEmailModal } from './SendInvoiceEmailModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Invoice {
  id: number;
  invoice_number: string;
  status: string;
  total_amount: string | number;
  paid_amount: string | number;
  balance: string | number;
  due_date: string | null;
  issued_date: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const APPOINTMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  SCHEDULED:   { label: 'Scheduled',   color: 'text-blue-700',   bgColor: 'bg-blue-50',   icon: <Clock className="w-3.5 h-3.5" /> },
  CONFIRMED:   { label: 'Confirmed',   color: 'text-sky-700',    bgColor: 'bg-sky-50',    icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CHECKED_IN:  { label: 'Checked In',  color: 'text-purple-700', bgColor: 'bg-purple-50', icon: <Activity className="w-3.5 h-3.5" /> },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: <Activity className="w-3.5 h-3.5" /> },
  COMPLETED:   { label: 'Completed',   color: 'text-green-700',  bgColor: 'bg-green-50',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CANCELLED:   { label: 'Cancelled',   color: 'text-red-700',    bgColor: 'bg-red-50',    icon: <XCircle className="w-3.5 h-3.5" /> },
  NO_SHOW:     { label: 'No Show',     color: 'text-gray-600',   bgColor: 'bg-gray-100',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Initial Consultation', FOLLOW_UP: 'Follow-up',
  THERAPY: 'Therapy Session', ASSESSMENT: 'Assessment',
};

// ─── CollapsibleSection ───────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  badgeColor?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, icon, children, defaultOpen = true, badge, badgeColor = 'bg-gray-100 text-gray-600',
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sky-600">{icon}</span>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {badge !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  patientEmail?: string;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen, onClose, appointment, patientEmail,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'invoice'>('details');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!appointment) return;
    setLoadingInvoices(true);
    try {
      const data = await getAppointmentInvoice(appointment.id);
      setInvoices(data?.results ?? data ?? []);
    } catch { setInvoices([]); }
    finally { setLoadingInvoices(false); }
  }, [appointment]);

  useEffect(() => {
    if (isOpen && appointment) {
      setActiveTab('details');
      fetchInvoices();
    }
  }, [isOpen, appointment, fetchInvoices]);

  // Fetch PDF client-side when Invoice tab is active
  useEffect(() => {
    const fetchPdf = async () => {
      if (activeTab !== 'invoice' || invoices.length === 0) {
        setPdfUrl(null);
        return;
      }

      setLoadingPdf(true);
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}/invoices/${invoices[0].id}/print/?token=${token}`
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      } catch (error) {
        console.error('Failed to fetch PDF:', error);
      } finally {
        setLoadingPdf(false);
      }
    };

    fetchPdf();

    // Cleanup blob URL on unmount or when pdfUrl changes
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [activeTab, invoices]);

  if (!isOpen || !appointment) return null;

  const statusConfig = APPOINTMENT_STATUS_CONFIG[appointment.status] || APPOINTMENT_STATUS_CONFIG['SCHEDULED'];
  const appointmentTypeLabel = APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type;

  const tabs = [
    { id: 'details' as const,  label: 'Appointment Details', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'invoice' as const,  label: 'Invoice',        icon: <Receipt className="w-3.5 h-3.5" />,     count: invoices.length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] pointer-events-auto flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Date block */}
                <div className="w-12 h-12 bg-sky-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                  <p className="text-[9px] font-bold text-sky-200 uppercase leading-none">
                    {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                  <p className="text-lg font-bold text-white leading-tight">
                    {new Date(appointment.date).getDate()}
                  </p>
                  <p className="text-[9px] text-sky-200 leading-none">
                    {new Date(appointment.date).getFullYear()}
                  </p>
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-bold text-gray-900">{appointmentTypeLabel}</h2>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {appointment.start_time} – {appointment.end_time}
                    </span>
                    {appointment.practitioner_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {appointment.practitioner_name}
                      </span>
                    )}
                    {appointment.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {appointment.location_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" aria-label="Close">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-gray-200 bg-gray-50 px-4 flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.id ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-3">
                <CollapsibleSection title="Appointment Information" icon={<Calendar className="w-4 h-4" />}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      { label: 'Date', value: formatDate(appointment.date) },
                      { label: 'Time', value: `${appointment.start_time} – ${appointment.end_time} (${appointment.duration_minutes} min)` },
                      { label: 'Type', value: appointmentTypeLabel },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-sm font-medium text-gray-900">{value}</p>
                      </div>
                    ))}
                    {appointment.practitioner_name && (
                      <div>
                        <p className="text-xs text-gray-500">Practitioner</p>
                        <p className="text-sm font-medium text-gray-900">{appointment.practitioner_name}</p>
                      </div>
                    )}
                    {appointment.location_name && (
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm font-medium text-gray-900">{appointment.location_name}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {appointment.notes && (
                  <CollapsibleSection title="Session Notes" icon={<FileText className="w-4 h-4" />}>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.notes}</p>
                  </CollapsibleSection>
                )}

                {appointment.patient_notes && (
                  <CollapsibleSection title="Patient Notes" icon={<User className="w-4 h-4" />} defaultOpen={false}>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.patient_notes}</p>
                  </CollapsibleSection>
                )}

                {(appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') && (
                  <CollapsibleSection title="Cancellation Details" icon={<XCircle className="w-4 h-4" />} badgeColor="bg-red-50 text-red-600">
                    <div className="space-y-2">
                      {appointment.cancellation_reason && (
                        <div>
                          <p className="text-xs text-gray-500">Reason</p>
                          <p className="text-sm text-gray-800">{appointment.cancellation_reason}</p>
                        </div>
                      )}
                      {appointment.cancelled_at && (
                        <div>
                          <p className="text-xs text-gray-500">Cancelled At</p>
                          <p className="text-sm text-gray-800">{formatDateTime(appointment.cancelled_at)}</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <span>Created: {formatDateTime(appointment.created_at)}</span>
                  <span>Updated: {formatDateTime(appointment.updated_at)}</span>
                </div>
              </div>
            )}

            {/* Invoice Tab */}
            {activeTab === 'invoice' && (
              <div className="space-y-3">
                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                  </div>
                ) : !appointment.has_invoice ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                      <Receipt className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No Invoice generated yet</p>
                    <p className="text-xs text-gray-400 mt-1">An invoice will appear here once generated</p>
                  </div>
                ) : invoices.length > 0 ? (
                  /* Display PDF preview inline with action buttons */
                  <div className="flex flex-col gap-4">
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          // Open print in new tab
                          const printUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}/invoices/${invoices[0].id}/print/?token=${localStorage.getItem('access_token') || ''}`;
                          window.open(printUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Send Email
                      </button>
                    </div>
                    {/* PDF Preview Container */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      {loadingPdf ? (
                        <div className="w-full h-[500px] flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Loading PDF...</p>
                          </div>
                        </div>
                      ) : pdfUrl ? (
                        <iframe
                          src={pdfUrl}
                          className="w-full h-[500px]"
                          title={`Invoice ${invoices[0].invoice_number}`}
                        />
                      ) : (
                        <div className="w-full h-[500px] flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Unable to load PDF</p>
                            <button
                              onClick={() => {
                                const printUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}/invoices/${invoices[0].id}/print/?token=${localStorage.getItem('access_token') || ''}`;
                                window.open(printUrl, '_blank', 'noopener,noreferrer');
                              }}
                              className="mt-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
                            >
                              Open in new tab
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                      <Receipt className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No Invoice found</p>
                    <p className="text-xs text-gray-400 mt-1">No invoice has been generated for this appointment</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Send Email Modal */}
      {showEmailModal && invoices.length > 0 && (
        <SendInvoiceEmailModal
          isOpen={showEmailModal}
          onClose={() => { setShowEmailModal(false); }}
          invoiceId={invoices[0].id}
          invoiceNumber={invoices[0].invoice_number}
          patientName={appointment.patient_name}
          patientEmail={patientEmail || ''}
          appointmentDate={formatDate(appointment.date)}
          appointmentType={APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}
        />
      )}
    </>
  );
};