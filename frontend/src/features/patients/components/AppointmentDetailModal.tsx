import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Clock, CheckCircle, XCircle, AlertCircle, Activity,
  Calendar, User, MapPin, FileText, Receipt,
  ChevronDown, ChevronUp, Loader2, Stethoscope,
  ClipboardList, AlertTriangle,
} from 'lucide-react';
import type { Appointment, ClinicalNote } from '@/types';
import { getAppointmentClinicalNotes, getAppointmentInvoice } from '@/features/appointments/appointment.api';

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
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: string | number;
  total: string | number;
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

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num || 0);
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

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT:     { label: 'Draft',      color: 'text-gray-600',   bgColor: 'bg-gray-100' },
  SENT:      { label: 'Sent',       color: 'text-sky-700',    bgColor: 'bg-sky-50' },
  PAID:      { label: 'Paid',       color: 'text-green-700',  bgColor: 'bg-green-50' },
  PARTIAL:   { label: 'Partial',    color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  OVERDUE:   { label: 'Overdue',    color: 'text-red-700',    bgColor: 'bg-red-50' },
  CANCELLED: { label: 'Cancelled',  color: 'text-gray-500',   bgColor: 'bg-gray-50' },
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

// ─── ClinicalNoteCard ─────────────────────────────────────────────────────────

interface ClinicalNoteCardProps { note: ClinicalNote; }

const ClinicalNoteCard: React.FC<ClinicalNoteCardProps> = ({ note }) => {
  const [expanded, setExpanded] = useState(false);

  const renderFieldValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined || value === '') return <span className="text-gray-400 italic">Not provided</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400 italic">None</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <span key={idx} className="inline-flex px-2 py-0.5 bg-sky-50 text-sky-700 text-xs rounded-full">{String(item)}</span>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="space-y-1">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-xs text-gray-500 flex-shrink-0">{k}:</span>
              <span className="text-xs text-gray-800">{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return String(value);
  };

  const content = note.decrypted_content;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-sky-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{note.template_name || 'Clinical Note'}</p>
            <p className="text-xs text-gray-500">By {note.practitioner_name} · {formatDate(note.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {note.is_signed ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium border border-green-200">
              <CheckCircle className="w-3 h-3" /> Signed
            </span>
          ) : note.is_draft ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200">
              <Clock className="w-3 h-3" /> Draft
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
              <FileText className="w-3 h-3" /> Saved
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            {expanded ? 'Collapse' : 'View'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          {content && Object.keys(content).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(content).map(([sectionKey, sectionValue]) => {
                if (typeof sectionValue === 'object' && sectionValue !== null && !Array.isArray(sectionValue)) {
                  return (
                    <div key={sectionKey}>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b border-gray-100">
                        {sectionKey.replace(/_/g, ' ')}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(sectionValue as Record<string, any>).map(([fieldKey, fieldValue]) => (
                          <div key={fieldKey}>
                            <span className="text-xs text-gray-500 capitalize">{fieldKey.replace(/_/g, ' ')}</span>
                            <div className="text-sm text-gray-800">{renderFieldValue(fieldValue)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={sectionKey}>
                    <span className="text-xs text-gray-500 capitalize">{sectionKey.replace(/_/g, ' ')}</span>
                    <div className="text-sm text-gray-800">{renderFieldValue(sectionValue)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-4">No content available for this note</p>
          )}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Note type: {note.note_type || 'General'}</span>
            {note.signed_at && <span>Signed: {formatDateTime(note.signed_at)}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── InvoiceCard ──────────────────────────────────────────────────────────────

interface InvoiceCardProps { invoice: Invoice; }

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice }) => {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status?.toUpperCase()] || INVOICE_STATUS_CONFIG['DRAFT'];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Invoice #{invoice.invoice_number}</p>
            <p className="text-xs text-gray-500">
              Issued: {formatDate(invoice.issued_date)}
              {invoice.due_date && ` · Due: ${formatDate(invoice.due_date)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium border ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            {expanded ? 'Collapse' : 'View'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Paid</p>
              <p className="text-sm font-bold text-green-700">{formatCurrency(invoice.paid_amount)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center border ${parseFloat(String(invoice.balance)) > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-0.5">Balance</p>
              <p className={`text-sm font-bold ${parseFloat(String(invoice.balance)) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {formatCurrency(invoice.balance)}
              </p>
            </div>
          </div>

          {invoice.items && invoice.items.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Description</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Unit Price</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800">{item.description}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen, onClose, appointment,
}) => {
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'invoice'>('details');

  const fetchClinicalNotes = useCallback(async () => {
    if (!appointment) return;
    setLoadingNotes(true);
    try {
      const data = await getAppointmentClinicalNotes(appointment.id);
      setClinicalNotes(data?.results ?? data ?? []);
    } catch { setClinicalNotes([]); }
    finally { setLoadingNotes(false); }
  }, [appointment]);

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
      fetchClinicalNotes();
      fetchInvoices();
    }
  }, [isOpen, appointment, fetchClinicalNotes, fetchInvoices]);

  if (!isOpen || !appointment) return null;

  const statusConfig = APPOINTMENT_STATUS_CONFIG[appointment.status] || APPOINTMENT_STATUS_CONFIG['SCHEDULED'];
  const appointmentTypeLabel = APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type;

  const tabs = [
    { id: 'details' as const,  label: 'Details',        icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'notes' as const,    label: 'Clinical Notes', icon: <Stethoscope className="w-3.5 h-3.5" />, count: clinicalNotes.length },
    { id: 'invoice' as const,  label: 'Invoice',        icon: <Receipt className="w-3.5 h-3.5" />,     count: invoices.length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 transition-opacity" onClick={onClose} />

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
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.icon} {statusConfig.label}
                      </span>
                    </div>
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

                {appointment.chief_complaint && (
                  <CollapsibleSection title="Chief Complaint" icon={<AlertTriangle className="w-4 h-4" />}>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.chief_complaint}</p>
                  </CollapsibleSection>
                )}

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

            {/* Clinical Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                  </div>
                ) : clinicalNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                      <Stethoscope className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No clinical notes</p>
                    <p className="text-xs text-gray-400 mt-1">No clinical notes were recorded for this appointment</p>
                  </div>
                ) : (
                  clinicalNotes.map((note) => <ClinicalNoteCard key={note.id} note={note} />)
                )}
              </div>
            )}

            {/* Invoice Tab */}
            {activeTab === 'invoice' && (
              <div className="space-y-3">
                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                      <Receipt className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No invoice found</p>
                    <p className="text-xs text-gray-400 mt-1">No invoice has been generated for this appointment</p>
                  </div>
                ) : (
                  invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)
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
    </>
  );
};