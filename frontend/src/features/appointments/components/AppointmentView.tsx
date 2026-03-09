import React, { useState } from 'react';
import {
  X, Calendar, Clock, User, FileText, Tag, MapPin,
  Receipt, Plus, Printer, CheckCircle, AlertCircle,
  RefreshCw, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Appointment } from '@/types';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_TYPE_LABELS } from '@/types';
import { invoiceApi } from '@/features/manage/services/billing.api';
import type { Invoice } from '@/types/billing';

// ── helpers ───────────────────────────────────────────────────────────────────
const INVOICE_STATUS_STYLES: Record<string, string> = {
  DRAFT:           'bg-gray-100 text-gray-600 border-gray-200',
  PENDING:         'bg-yellow-50 text-yellow-700 border-yellow-200',
  PAID:            'bg-green-50 text-green-700 border-green-200',
  PARTIALLY_PAID:  'bg-blue-50 text-blue-700 border-blue-200',
  OVERDUE:         'bg-red-50 text-red-700 border-red-200',
  CANCELLED:       'bg-gray-100 text-gray-400 border-gray-200',
};

type Tab = 'details' | 'invoice';

interface AppointmentViewProps {
  isOpen:      boolean;
  onClose:     () => void;
  appointment: Appointment | null;
  onEdit?:     (appointment: Appointment) => void;
  onDelete?:   (appointment: Appointment) => void;
}

// ── Invoice Tab Content ───────────────────────────────────────────────────────
const InvoiceTab: React.FC<{ appointment: Appointment }> = ({ appointment }) => {
  const qc = useQueryClient();

  const {
    data:      invoice,
    isLoading,
    refetch,
  } = useQuery<Invoice | null>({
    queryKey: ['appointment-invoice', appointment.id],
    queryFn:  () => invoiceApi.getByAppointment(appointment.id),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      invoiceApi.create({
        appointment:  appointment.id,
        patient:      appointment.patient_id,
        clinic:       appointment.clinic_id,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointment-invoice', appointment.id] });
    },
    onError: (error: any) => {
      console.error('❌ Invoice creation error:', error?.response?.data);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading invoice…
      </div>
    );
  }

  // ── No invoice yet ─────────────────────────────────────────────────────────
  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
          <Receipt className="w-8 h-8 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">No invoice yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Generate an invoice for this appointment
          </p>
        </div>

        {createMutation.isError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              {JSON.stringify(
                (createMutation.error as any)?.response?.data ??
                'Failed to create invoice. Please try again.'
              )}
            </span>
          </div>
        )}

        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {createMutation.isPending
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : <Plus className="w-4 h-4" />}
          {createMutation.isPending ? 'Generating…' : 'Generate Invoice'}
        </button>
      </div>
    );
  }

  // ── Invoice exists ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Invoice header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-500">Invoice Number</p>
          <p className="text-base font-bold text-gray-900 font-mono">
            {invoice.invoice_number}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${INVOICE_STATUS_STYLES[invoice.status] ?? ''}`}>
            {invoice.status_display}
          </span>
          <button
            onClick={() => invoiceApi.print(invoice.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={() => refetch()}
            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500">Invoice Date</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">
            {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500">Due Date</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">
            {invoice.due_date
              ? format(new Date(invoice.due_date), 'MMM d, yyyy')
              : <span className="text-gray-400">—</span>}
          </p>
        </div>
      </div>

      {/* Line items */}
      {invoice.items.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Items
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Description</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Qty</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Price</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoice.items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-800">{item.description}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    ₱{parseFloat(item.unit_price).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                    ₱{parseFloat(item.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        {[
          { label: 'Subtotal',         value: invoice.subtotal },
          { label: 'Discount',         value: invoice.discount_amount },
          { label: 'Tax',              value: invoice.tax_amount },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-700">₱{parseFloat(value).toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Total</span>
          <span className="text-base font-bold text-gray-900">
            ₱{parseFloat(invoice.total_amount).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Amount Paid</span>
          <span className="text-green-600 font-medium">
            ₱{parseFloat(invoice.amount_paid).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700">Balance Due</span>
          <span className={`font-bold ${parseFloat(invoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₱{parseFloat(invoice.balance_due).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Paid action */}
      {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
        <div className="flex justify-end pt-1">
          <button
            onClick={async () => {
              await invoiceApi.updateStatus(invoice.id, 'PAID');
              qc.invalidateQueries({ queryKey: ['appointment-invoice', appointment.id] });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as Paid
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const AppointmentView: React.FC<AppointmentViewProps> = ({
  isOpen,
  onClose,
  appointment,
  onEdit,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('details');

  if (!isOpen || !appointment) return null;

  const statusColors = APPOINTMENT_STATUS_COLORS[appointment.status];
  const typeLabel    = APPOINTMENT_TYPE_LABELS[appointment.appointment_type];
  const formattedDate = format(new Date(appointment.date), 'EEEE, MMMM d, yyyy');
  const formattedTime = `${appointment.start_time} - ${appointment.end_time}`;

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins  = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Appointment Details</h2>
                <p className="text-xs text-gray-500">{appointment.patient_name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            {([
              { key: 'details', label: 'Details',  icon: FileText },
              { key: 'invoice', label: 'Invoice',  icon: Receipt  },
            ] as { key: Tab; label: string; icon: React.ElementType }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ── Details Tab ── */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Status + Type */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                    {appointment.status.replace('_', ' ')}
                  </span>
                  <span className="text-gray-300 text-sm">·</span>
                  <span className="text-sm font-medium text-gray-600">{typeLabel}</span>
                </div>

                {/* Date & Time */}
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-sky-600 font-medium">Date</p>
                        <p className="text-sm font-semibold text-gray-900">{formattedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-sky-600 font-medium">Time</p>
                        <p className="text-sm font-semibold text-gray-900">{formattedTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-sky-600 font-medium">Duration</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDuration(appointment.duration_minutes)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient & Practitioner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <User className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{appointment.patient_name}</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <User className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Practitioner</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{appointment.practitioner_name}</p>
                  </div>
                </div>

                {/* Location */}
                {appointment.location_name && (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</span>
                    </div>
                    <p className="text-sm text-gray-900">{appointment.location_name}</p>
                  </div>
                )}

                {/* Chief Complaint */}
                {appointment.chief_complaint && (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chief Complaint</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.chief_complaint}</p>
                  </div>
                )}

                {/* Internal Notes */}
                {appointment.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Internal Notes</span>
                      <span className="text-xs text-amber-500">(Staff Only)</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.notes}</p>
                  </div>
                )}

                {/* Patient Notes */}
                {appointment.patient_notes && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Patient Notes</span>
                      <span className="text-xs text-sky-500">(Visible to Patient)</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.patient_notes}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  {[
                    { label: 'Created by', value: appointment.created_by_name || 'Unknown' },
                    { label: 'Created at', value: format(new Date(appointment.created_at), 'MMM d, yyyy h:mm a') },
                    ...(appointment.updated_by_name
                      ? [
                          { label: 'Last updated by', value: appointment.updated_by_name },
                          { label: 'Updated at',      value: format(new Date(appointment.updated_at), 'MMM d, yyyy h:mm a') },
                        ]
                      : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Quick link to invoice tab */}
                <button
                  onClick={() => setActiveTab('invoice')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-sky-600" />
                    <span className="text-sm font-medium text-sky-700">View / Generate Invoice</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-sky-400" />
                </button>
              </div>
            )}

            {/* ── Invoice Tab ── */}
            {activeTab === 'invoice' && (
              <InvoiceTab appointment={appointment} />
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {activeTab === 'details' && (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(appointment)}
                    className="px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {onDelete &&
                  appointment.status !== 'COMPLETED' &&
                  appointment.status !== 'CANCELLED' && (
                    <button
                      onClick={() => onDelete(appointment)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Cancel Appointment
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};