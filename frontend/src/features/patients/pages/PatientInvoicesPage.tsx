import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { billingApi } from '@/features/billing/billing.api';
import type { Invoice, PaymentMethod } from '@/types/billing';
import toast from 'react-hot-toast';
import { usePatientProfileContext } from '../context/PatientProfileContext';
import { InvoiceList, InvoiceDetailModal, AddPaymentModal } from '@/features/billing/Invoices';
import { SendInvoiceEmailModal } from '../components/SendInvoiceEmailModal';

export const PatientInvoicesPage: React.FC = () => {
  const { patientId, patient } = usePatientProfileContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [invoiceToEmail, setInvoiceToEmail] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const filters = {
        patient: patientId,
        page,
        page_size: pageSize,
        ordering: '-invoice_date',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedStatus && { status: selectedStatus }),
      };

      const response = await billingApi.getInvoices(filters);
      setInvoices(response.results || []);
      setTotalPages(Math.ceil(response.count / pageSize));
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load patient invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, patientId]);

  useEffect(() => {
    setPage(1);
    fetchInvoices();
  }, [searchQuery, selectedStatus]);

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const fullInvoice = await billingApi.getInvoice(invoice.id);
      setSelectedInvoice(fullInvoice);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const handleEditInvoice = () => {
    toast('Editing invoices is not yet implemented.', { icon: 'ℹ️' });
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    window.open(`/api/invoices/${invoice.id}/print/`, '_blank');
  };

  const handleSendEmail = (invoice: Invoice) => {
    setInvoiceToEmail(invoice);
    setShowEmailModal(true);
  };

  const handleAddPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      await billingApi.updateInvoice(invoice.id, { status: 'PAID' });
      toast.success('Invoice marked as paid');
      fetchInvoices();
      setShowDetailModal(false);
      setSelectedInvoice(null);
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
    setShowPaymentModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      await billingApi.deleteInvoice(invoiceToDelete.id);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
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
    setPage(1);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-sm">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
            <p className="text-xs text-gray-400">
              {patient?.full_name}'s billing history
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {(searchQuery || selectedStatus) && (
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

      {/* List */}
      <div className="flex-1 overflow-auto bg-white">
        <InvoiceList
          invoices={invoices}
          isLoading={isLoading}
          onView={handleViewInvoice}
          onEdit={handleEditInvoice}
          onDelete={handleDeleteInvoice}
          onPrint={handlePrintInvoice}
          onSendEmail={handleSendEmail}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-gray-200 bg-white rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-gray-200 bg-white rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        onAddPayment={handleAddPayment}
        onMarkPaid={handleMarkPaid}
        onSendEmail={handleSendEmail}
      />

      <AddPaymentModal
        invoice={selectedInvoice}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
        }}
        onSubmit={handlePaymentSubmit}
      />

      {showDeleteConfirm && invoiceToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
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

      {showEmailModal && invoiceToEmail && (
        <SendInvoiceEmailModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setInvoiceToEmail(null);
          }}
          invoiceId={invoiceToEmail.id}
          invoiceNumber={invoiceToEmail.invoice_number}
          patientName={invoiceToEmail.patient_name || ''}
          patientEmail={''}
          appointmentDate={invoiceToEmail.invoice_date || ''}
          appointmentType={invoiceToEmail.appointment ? 'Appointment' : 'Service'}
        />
      )}
    </div>
  );
};

export default PatientInvoicesPage;
