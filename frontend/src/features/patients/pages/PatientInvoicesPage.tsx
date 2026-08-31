import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Layers
} from 'lucide-react';
import { billingApi } from '@/features/billing/billing.api';
import type { Invoice, PaymentMethod } from '@/types/billing';
import toast from 'react-hot-toast';
import { usePatientProfileContext } from '../context/PatientProfileContext';
import { InvoiceList, InvoiceDetailModal, AddPaymentModal, PrintInvoiceModal } from '@/features/billing/Invoices';
import { SendInvoiceEmailModal } from '../components/SendInvoiceEmailModal';
import { MasterInvoiceCard } from '../components/MasterInvoiceCard';
import { getAppointments } from '@/features/appointments/appointment.api';
import type { Appointment } from '@/types/appointment';
import { format } from 'date-fns';

export const PatientInvoicesPage: React.FC = () => {
  const { patientId, patient } = usePatientProfileContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);

  // Outstanding Balance Monitoring
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [apptPage, setApptPage] = useState(1);
  const [apptTotalPages, setApptTotalPages] = useState(1);
  const [isLoadingAppts, setIsLoadingAppts] = useState(true);

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

  // Fetch all invoices for the patient (unpaginated/large limit) to calculate global outstanding balances
  useEffect(() => {
    if (!patientId) return;
    const fetchAllInvoices = async () => {
      try {
        const response = await billingApi.getInvoices({
          patient: patientId,
          page_size: 1000,
        });
        setAllInvoices(response.results || []);
      } catch (error) {
        console.error('Failed to fetch all invoices for monitoring:', error);
      }
    };
    fetchAllInvoices();
  }, [patientId]);

  // Fetch appointments for monitoring table
  useEffect(() => {
    if (!patientId) return;
    const fetchAppts = async () => {
      setIsLoadingAppts(true);
      try {
        const response = await getAppointments({
          patient: patientId,
          page: apptPage,
          page_size: 15,
          ordering: '-date',
          status: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'ARRIVED', 'DNA'] // Excludes CANCELLED
        });
        setAppointments(response.results || []);
        setApptTotalPages(Math.ceil(response.count / 15));
      } catch (error) {
        console.error('Failed to fetch appointments for monitoring:', error);
      } finally {
        setIsLoadingAppts(false);
      }
    };
    fetchAppts();
  }, [patientId, apptPage]);

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const fullInvoice = await billingApi.getInvoice(invoice.id);
      setSelectedInvoice(fullInvoice);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const handleInvoiceUpdated = (updatedInvoice: Invoice) => {
    setSelectedInvoice(updatedInvoice);
    setInvoices((prev) => prev.map((inv) => inv.id === updatedInvoice.id ? updatedInvoice : inv));
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);

  const handlePrintInvoice = (invoice: Invoice) => {
    setInvoiceToPrint(invoice);
    setShowPrintModal(true);
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

  const masterInvoices = invoices.filter(inv => inv.patient_case !== null && inv.patient_case !== undefined);
  const regularInvoices = invoices.filter(inv => inv.patient_case === null || inv.patient_case === undefined);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden rounded-2xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-6 py-5 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center shadow-sm">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
            <p className="text-sm text-gray-500">
              Manage master invoices and standard transactions for {patient?.full_name}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
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
      <div className="flex-1 overflow-auto p-6 space-y-8">
        
        {masterInvoices.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-gray-900">Master Invoices</h2>
              <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {masterInvoices.length} Packages
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {masterInvoices.map((inv) => (
                <MasterInvoiceCard 
                  key={inv.id} 
                  invoice={inv} 
                  onClick={handleViewInvoice} 
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">Standard Transactions</h2>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <InvoiceList
              invoices={regularInvoices}
              isLoading={isLoading}
              onView={handleViewInvoice}
              onEdit={handleViewInvoice}
              onDelete={handleDeleteInvoice}
              onPrint={handlePrintInvoice}
              onSendEmail={handleSendEmail}
            />
          </div>
        </section>

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

      {/* Outstanding Balance Monitoring Table */}
      <div className="flex-shrink-0 px-6 py-6 border-t border-gray-300 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-600" />
          Outstanding Balance Monitoring
        </h2>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Appointment Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Time</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Session Allocation</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Primary Practitioner</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingAppts ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Loading appointments...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No appointments found.
                    </td>
                  </tr>
                ) : (
                  appointments.map(appt => {
                    let outstandingBalance = 0;
                    let isPackageBalance = false;
                    
                    if (appt.patient_case) {
                      const masterInv = allInvoices.find(inv => inv.patient_case === appt.patient_case && inv.status !== 'CANCELLED');
                      if (masterInv && Number(masterInv.balance_due) > 0) {
                        outstandingBalance = Number(masterInv.balance_due);
                        isPackageBalance = true;
                      }
                    } else {
                      const stdInv = allInvoices.find(inv => inv.appointment === appt.id && inv.status !== 'CANCELLED');
                      if (stdInv && Number(stdInv.balance_due) > 0) {
                        outstandingBalance = Number(stdInv.balance_due);
                      }
                    }

                    return (
                      <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {format(new Date(appt.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {appt.start_time} - {appt.end_time}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {appt.appointment_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {appt.patient_case ? appt.session_display || 'Packaged' : 'Un-packaged'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {appt.practitioner_name || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {outstandingBalance > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-red-600">₱{outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              {isPackageBalance && (
                                <span className="text-[10px] text-gray-400 font-normal uppercase">(Package Balance)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-gray-200">
                  <td colSpan={5} className="px-4 py-4 text-sm font-bold text-gray-900 text-right uppercase tracking-wider">
                    Total Outstanding Balance
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-red-600 text-right">
                    ₱{(() => {
                      const countedIds = new Set<number>();
                      let total = 0;
                      allInvoices.forEach(inv => {
                        if (inv.status !== 'CANCELLED' && inv.status !== 'PAID' && Number(inv.balance_due) > 0) {
                          if (!countedIds.has(inv.id)) {
                            countedIds.add(inv.id);
                            total += Number(inv.balance_due);
                          }
                        }
                      });
                      return total.toLocaleString('en-US', { minimumFractionDigits: 2 });
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Appointments Pagination */}
          {apptTotalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page {apptPage} of {apptTotalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setApptPage(p => Math.max(1, p - 1))}
                  disabled={apptPage === 1}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setApptPage(p => Math.min(apptTotalPages, p + 1))}
                  disabled={apptPage === apptTotalPages}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
        onPrint={handlePrintInvoice}
        onInvoiceUpdated={handleInvoiceUpdated}
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
          patientEmail={invoiceToEmail.patient_email || ''}
          appointmentDate={invoiceToEmail.invoice_date || ''}
          appointmentType={invoiceToEmail.appointment ? 'Appointment' : 'Service'}
        />
      )}

      {showPrintModal && invoiceToPrint && (
        <PrintInvoiceModal
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setInvoiceToPrint(null);
          }}
          invoice={invoiceToPrint}
        />
      )}
    </div>
  );
};

export default PatientInvoicesPage;
