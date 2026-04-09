import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { 
  Receipt, 
  Search, 
  Loader2,
  Printer,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { billingApi } from './billing.api';
import type { 
  Invoice, 
  InvoiceStats, 
  InvoiceStatus,
  PaymentMethod 
} from '@/types/billing';
import toast from 'react-hot-toast';
import { PHILIPPINE_BANKS, requiresBankSelection } from '@/data/philippineBanks';

// Status badge colors
const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-700 border-blue-200',
  OVERDUE: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  BANK_TRANSFER: 'Bank Transfer',
  GCASH: 'GCash',
};

// ─────────────────────────────────────────────────────────────────────────────
// Invoice List Component
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading: boolean;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onPrint,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Receipt className="w-12 h-12 mb-3 text-gray-300" />
        <p>No invoices found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Invoice #</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Patient</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Date</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Total</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Paid</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Balance</th>
            <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((invoice) => (
            <tr 
              key={invoice.id} 
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onView(invoice)}
            >
              <td className="px-4 py-3 text-sm font-medium text-sky-600">
                {invoice.invoice_number}
              </td>
              <td className="px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900">{invoice.patient_name}</div>
                  <div className="text-xs text-gray-500">{invoice.patient_number}</div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[invoice.status as InvoiceStatus]}`}>
                  {invoice.status_display}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                ₱{parseFloat(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-sm text-emerald-600 text-right">
                ₱{parseFloat(invoice.amount_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={parseFloat(invoice.balance_due) > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                  ₱{parseFloat(invoice.balance_due).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onPrint(invoice)}
                    className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                    title="Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(invoice)}
                    className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(invoice)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onAddPayment: (invoice: Invoice) => void;
  onMarkPaid: (invoice: Invoice) => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onAddPayment,
  onMarkPaid,
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    billingApi.print(invoice.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Invoice Details</h2>
              <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Patient & Status */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-gray-500 uppercase">Patient</label>
                <p className="text-sm font-medium text-gray-900">{invoice.patient_name}</p>
                <p className="text-xs text-gray-500">{invoice.patient_number}</p>
              </div>
              <div className="text-right">
                <label className="text-xs text-gray-500 uppercase">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[invoice.status as InvoiceStatus]}`}>
                    {invoice.status_display}
                  </span>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-gray-500 uppercase">Invoice Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(invoice.invoice_date).toLocaleDateString()}
                </p>
              </div>
              {invoice.due_date && (
                <div className="text-right">
                  <label className="text-xs text-gray-500 uppercase">Due Date</label>
                  <p className="text-sm text-gray-900">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Line Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Description</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Unit Price</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-900">{item.description}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          ₱{parseFloat(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          ₱{parseFloat(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">₱{parseFloat(invoice.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                {parseFloat(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount ({invoice.discount_percent}%)</span>
                    <span className="text-red-600">-₱{parseFloat(invoice.discount_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {parseFloat(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({invoice.tax_percent}%)</span>
                    <span className="text-gray-900">₱{parseFloat(invoice.tax_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>₱{parseFloat(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-emerald-600">-₱{parseFloat(invoice.amount_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Balance Due</span>
                  <span className={parseFloat(invoice.balance_due) > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    ₱{parseFloat(invoice.balance_due).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payments */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Payment History</h3>
                <div className="space-y-2">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{payment.receipt_number}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString()} • {paymentMethodLabels[payment.payment_method as PaymentMethod]}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-emerald-600">
                        ₱{parseFloat(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            {parseFloat(invoice.balance_due) > 0 && invoice.status !== 'PAID' && (
              <>
                <button
                  onClick={() => onAddPayment(invoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Add Payment
                </button>
                <button
                  onClick={() => onMarkPaid(invoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Mark as Paid
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Add Payment Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AddPaymentModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoiceId: number, amount: number, paymentMethod: PaymentMethod, paymentDate: string, reference?: string, bankName?: string) => Promise<void>;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  invoice,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [bankName, setBankName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balance_due);
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(invoice.id, parseFloat(amount), paymentMethod, paymentDate, reference, bankName || undefined);
      onClose();
      setAmount('');
      setReference('');
      setBankName('');
    } catch (error) {
      toast.error('Failed to add payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showBankSelector = requiresBankSelection(paymentMethod);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Add Payment</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm">
                {invoice.invoice_number} — {invoice.patient_name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Balance Due</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-red-600">
                ₱{parseFloat(invoice.balance_due).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const val = e.target.value as PaymentMethod;
                  setPaymentMethod(val);
                  if (!requiresBankSelection(val)) setBankName('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {showBankSelector && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank / Card Issuer</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select bank...</option>
                  {PHILIPPINE_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.shortName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number (Optional)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Transaction ID, check number, etc."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                Add Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Invoices Component
// ─────────────────────────────────────────────────────────────────────────────

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Fetch invoices
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      // Use the API's filter format (status is string, not InvoiceStatus)
      const filters = {
        page,
        page_size: pageSize,
        ordering: '-invoice_date',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      };

      const response = await billingApi.getInvoices(filters);
      setInvoices(response.results || []);
      setTotalPages(Math.ceil(response.count / pageSize));
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await billingApi.getStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [page]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchInvoices();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedStatus, dateFrom, dateTo]);

  // Handlers
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleEditInvoice = () => {
    // For now, redirect to edit or open a modal
    toast.success('Edit functionality coming soon');
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    billingApi.print(invoice.id);
  };

  const handleAddPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
    setShowDetailModal(false);
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      await billingApi.markPaid(invoice.id);
      toast.success('Invoice marked as paid');
      fetchInvoices();
      fetchStats();
      setShowDetailModal(false);
    } catch (error) {
      toast.error('Failed to mark invoice as paid');
    }
  };

  const handlePaymentSubmit = async (
    invoiceId: number, 
    amount: number, 
    paymentMethod: PaymentMethod, 
    paymentDate: string, 
    reference?: string,
    bankName?: string
  ) => {
    await billingApi.createPayment({
      invoice: invoiceId,
      payment_date: paymentDate,
      amount,
      payment_method: paymentMethod,
      bank_name: bankName,
      reference_number: reference,
    });
    toast.success('Payment added successfully');
    fetchInvoices();
    fetchStats();
    setShowPaymentModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    
    try {
      await billingApi.deleteInvoice(invoiceToDelete.id);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete invoice');
    } finally {
      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
              <p className="text-xs text-gray-400">
                Manage patient invoices and payments
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase mb-1">Total Invoiced</div>
                <div className="text-xl font-bold text-gray-900">
                  ₱{stats.total_invoiced.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase mb-1">Total Paid</div>
                <div className="text-xl font-bold text-emerald-600">
                  ₱{stats.total_paid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase mb-1">Total Balance</div>
                <div className="text-xl font-bold text-red-600">
                  ₱{stats.total_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase mb-1">Total Invoices</div>
                <div className="text-xl font-bold text-gray-900">{stats.count}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number or patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                placeholder="From"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                placeholder="To"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedStatus || dateFrom || dateTo) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Invoice List */}
        <div className="flex-1 overflow-auto">
          <InvoiceList
            invoices={invoices}
            isLoading={isLoading}
            onView={handleViewInvoice}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onPrint={handlePrintInvoice}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        onAddPayment={handleAddPayment}
        onMarkPaid={handleMarkPaid}
      />

      {/* Add Payment Modal */}
      <AddPaymentModal
        invoice={selectedInvoice}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
        }}
        onSubmit={handlePaymentSubmit}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && invoiceToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
            
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Invoice</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete invoice <strong>{invoiceToDelete.invoice_number}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Invoices;