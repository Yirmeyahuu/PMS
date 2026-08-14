import React, { useState, useEffect } from 'react';
import {
  Printer, Edit, Mail, X, DollarSign, Check
} from 'lucide-react';
import { billingApi } from '../billing.api';
import type { Invoice, InvoiceVersion, InvoiceStatus, PaymentMethod } from '@/types/billing';
import { EditInvoiceModal } from './EditInvoiceModal';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-700 border-blue-200',
  OVERDUE: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-400 border-gray-200',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  BANK_TRANSFER: 'Bank Transfer',
  GCASH: 'GCash',
};

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onAddPayment: (invoice: Invoice) => void;
  onMarkPaid: (invoice: Invoice) => void;
  onSendEmail: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
  onInvoiceUpdated?: (updatedInvoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onAddPayment,
  onMarkPaid,
  onSendEmail,
  onPrint,
  onInvoiceUpdated,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [versions, setVersions] = useState<InvoiceVersion[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    if (isOpen && invoice) {
      setSelectedVersionNum(invoice.version_number);
      fetchVersions(invoice.id);
    } else {
      setVersions([]);
      setSelectedVersionNum(null);
    }
  }, [isOpen, invoice]);

  const fetchVersions = async (id: number) => {
    setIsLoadingVersions(true);
    try {
      const data = await billingApi.getInvoiceVersions(id);
      setVersions(data);
    } catch {
      // silently ignore
    } finally {
      setIsLoadingVersions(false);
    }
  };

  if (!isOpen || !invoice) return null;

  const isCurrentVersion = selectedVersionNum === invoice.version_number;
  const currentHistoricalVersion = versions.find(v => v.version_number === selectedVersionNum);

  // Helper to get fields depending on whether we are viewing current or historical
  const displayData = isCurrentVersion ? invoice : (currentHistoricalVersion || invoice);

  const getItems = () => {
    if (isCurrentVersion) return invoice.items || [];
    return (currentHistoricalVersion?.items_snapshot || []).map((item, idx) => ({
      id: idx,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total
    }));
  };

  const itemsToRender = getItems();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-3">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]" style={{ minHeight: '600px' }}>

          {/* LEFT SIDEBAR: VERSION HISTORY */}
          <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {invoice.patient_case ? 'Session Timeline' : 'Version History'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoadingVersions && versions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Loading versions...</p>
              ) : (
                <>
                  {/* Always show current version at the top if it's not in the versions array yet */}
                  <button
                    onClick={() => setSelectedVersionNum(invoice.version_number)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${isCurrentVersion
                      ? 'bg-sky-50 border-sky-200 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${isCurrentVersion ? 'text-sky-900' : 'text-gray-700'}`}>
                        {invoice.patient_case ? `Master Status (v${invoice.version_number})` : `Version ${invoice.version_number}`}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">
                        CURRENT
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[11px] text-gray-500 truncate">
                        <span className="font-medium text-gray-600">Created by:</span> {invoice.created_by_name || 'System'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        <span className="font-medium text-gray-600">Modified by:</span> {invoice.modified_by_name || invoice.created_by_name || 'System'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(invoice.updated_at || invoice.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>

                  {/* Render historical versions */}
                  {versions.filter(v => v.version_number !== invoice.version_number).map((v) => {
                    const isSelected = selectedVersionNum === v.version_number;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionNum(v.version_number)}
                        className={`w-full text-left p-3 rounded-xl transition-all border ${isSelected
                          ? 'bg-sky-50 border-sky-200 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-bold ${isSelected ? 'text-sky-900' : 'text-gray-700'}`}>
                            {invoice.patient_case ? (v.appointment ? `Session (Appt ${v.appointment})` : `Initial Creation`) : `Version ${v.version_number}`}
                          </span>
                        </div>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-[11px] text-gray-500 truncate">
                            <span className="font-medium text-gray-600">Created by:</span> {invoice.created_by_name || 'System'}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            <span className="font-medium text-gray-600">Modified by:</span> {v.created_by_name || 'System'}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(v.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                          {invoice.patient_case && parseFloat(v.payment_made || '0') > 0 && (
                            <p className="text-[11px] font-bold text-emerald-600 mt-1">
                              + ₱{parseFloat(v.payment_made).toLocaleString()} Paid
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Invoice Details</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    v{displayData.version_number}
                  </span>
                  {!isCurrentVersion && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      HISTORICAL (READ-ONLY)
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
              </div>
              <div className="flex items-center gap-2">
                {isCurrentVersion && (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Invoice
                    </button>
                    <button
                      onClick={() => onSendEmail(invoice)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </button>
                    <button
                      onClick={() => onPrint(invoice)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">

              {/* Show Change Summary for Historical Versions */}
              {!isCurrentVersion && currentHistoricalVersion?.change_summary && Object.keys(currentHistoricalVersion.change_summary).length > 0 && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-800 uppercase mb-3">Changes in this version</h4>
                  <div className="space-y-2">
                    {Object.entries(currentHistoricalVersion.change_summary).map(([field, diff]) => {
                      if (field === 'payment_added' || field === 'payment_removed') {
                        const isAdded = field === 'payment_added';
                        const details = diff as unknown as { amount: string; method: string };
                        return (
                          <div key={field} className={`flex items-start gap-2 text-xs font-semibold ${isAdded ? 'text-emerald-700' : 'text-red-700'}`}>
                            <span className="w-36 flex-shrink-0 capitalize">{field.replace(/_/g, ' ')}:</span>
                            <span>₱{parseFloat(details.amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({details.method})</span>
                          </div>
                        );
                      }
                      return (
                        <div key={field} className="flex items-start gap-2 text-sm text-amber-900">
                          <span className="font-medium w-36 flex-shrink-0 capitalize">{field.replace(/_/g, ' ')}:</span>
                          <span className="line-through text-red-500">{(diff as any).from || '—'}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-emerald-700 font-medium">{(diff as any).to || '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Patient & Status */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Patient</label>
                  <p className="text-base font-bold text-gray-900">{invoice.patient_name}</p>
                  <p className="text-sm text-gray-500">{invoice.patient_number}</p>
                </div>
                <div className="text-right">
                  <label className="text-xs text-gray-500 uppercase">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[displayData.status as InvoiceStatus]}`}>
                      {displayData.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-8 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-medium">Invoice Date</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {new Date(displayData.invoice_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                {displayData.due_date && (
                  <div className="text-right">
                    <label className="text-xs text-gray-500 uppercase font-medium">Due Date</label>
                    <p className="text-sm text-gray-900 mt-1 font-medium">
                      {new Date(displayData.due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Line Items</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Qty</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Unit Price</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {itemsToRender.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{item.description}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            ₱{parseFloat(String(item.unit_price)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-bold">
                            ₱{parseFloat(String(item.total)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-full md:w-1/2 space-y-3 bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Subtotal</span>
                    <span className="text-gray-900 font-semibold">₱{parseFloat(String(displayData.subtotal)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {parseFloat(String(displayData.discount_amount)) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Discount ({displayData.discount_percent}%)</span>
                      <span className="text-red-600 font-semibold">-₱{parseFloat(String(displayData.discount_amount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {parseFloat(String(displayData.tax_amount)) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Tax ({displayData.tax_percent}%)</span>
                      <span className="text-gray-900 font-semibold">₱{parseFloat(String(displayData.tax_amount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-3 border-t border-gray-200">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">₱{parseFloat(String(displayData.total_amount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-gray-600 font-medium">Amount Paid</span>
                    <span className="text-emerald-600 font-bold">-₱{parseFloat(String(displayData.amount_paid)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black pt-3 border-t border-gray-200">
                    <span className="text-gray-900">Balance Due</span>
                    <span className={parseFloat(String(displayData.balance_due)) > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {parseFloat(String(displayData.balance_due)) < 0 ? '-' : ''}₱{Math.abs(parseFloat(String(displayData.balance_due))).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payments (Only show if we are on the current version, since historical versions don't return full payments list) */}
              {isCurrentVersion && invoice.payments && invoice.payments.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Payment History</h3>
                  <div className="space-y-3">
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 shadow-sm rounded-xl">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{payment.receipt_number}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(payment.payment_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} • {paymentMethodLabels[payment.payment_method as PaymentMethod] || payment.payment_method}
                          </p>
                        </div>
                        <span className="text-base font-black text-emerald-600">
                          ₱{parseFloat(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Area */}
            {isCurrentVersion && (
              <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                {parseFloat(invoice.balance_due) > 0 && invoice.status !== 'PAID' && (
                  <>
                    <button
                      onClick={() => onAddPayment(invoice)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold transition-colors shadow-sm"
                    >
                      <DollarSign className="w-4 h-4" />
                      Add Payment
                    </button>
                    <button
                      onClick={() => onMarkPaid(invoice)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      Mark as Paid
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Invoice Modal */}
      {isCurrentVersion && (
        <EditInvoiceModal
          invoice={invoice}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            if (onInvoiceUpdated) onInvoiceUpdated(updated);
          }}
        />
      )}
    </div>
  );
};
