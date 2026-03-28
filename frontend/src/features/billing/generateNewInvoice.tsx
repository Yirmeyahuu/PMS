import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  Calculator,
  CreditCard,
  FileText,
  ChevronRight,
  Printer,
  User,
  Calendar,
  StickyNote
} from 'lucide-react';
import { billingApi, type ClinicService } from './billing.api';
import { getMyClinic, type ClinicProfile } from '@/features/clinics/clinic.api';
import type { 
  Invoice, 
  PaymentMethod 
} from '@/types/billing';
import axiosInstance from '@/lib/axios';
import type { Appointment } from '@/types/appointment';
import toast from 'react-hot-toast';

interface EditableItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
}

interface PaymentEntry {
  id?: number;
  paymentMethod: PaymentMethod;
  amount: string;
  referenceNumber: string;
}

// Helper to get display name for payment method
const getPaymentMethodLabel = (method: PaymentMethod): string => {
  const labels: Record<PaymentMethod, string> = {
    CASH: 'Cash',
    CREDIT_CARD: 'Credit Card',
    DEBIT_CARD: 'Debit Card',
    BANK_TRANSFER: 'Bank Transfer',
    GCASH: 'GCash',
  };
  return labels[method] || method;
};

export default function GenerateNewInvoice() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);

  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([
    { paymentMethod: 'CASH', amount: '', referenceNumber: '' },
  ]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: appointment, isLoading: loadingAppointment } = useQuery<Appointment>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/appointments/${appointmentId}/`);
      return data;
    },
    enabled: !!appointmentId,
  });

  const { data: existingInvoice, isLoading: loadingInvoice } = useQuery<Invoice | null>({
    queryKey: ['appointment-invoice', appointmentId],
    queryFn: () => billingApi.getByAppointment(Number(appointmentId)),
    enabled: !!appointmentId,
  });

  const { data: clinicServices = [] } = useQuery<ClinicService[]>({
    queryKey: ['clinic-services'],
    queryFn: () => billingApi.getClinicServices(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clinicProfile } = useQuery<ClinicProfile>({
    queryKey: ['my-clinic'],
    queryFn: getMyClinic,
    staleTime: 10 * 60 * 1000,
  });

  const { data: nextAppointment } = useQuery({
    queryKey: ['patient-next-appointment', appointment?.patient, appointmentId],
    queryFn: async () => {
      if (!appointment?.patient) return null;
      // Get upcoming appointments excluding the current one
      const currentDate = appointment.date;
      const params = new URLSearchParams({
        patient: String(appointment.patient),
        date_from: currentDate, // Start from current appointment date
        ordering: 'date,start_time',
        page_size: '10',
      });
      const { data } = await axiosInstance.get(`/appointments/?${params.toString()}`);
      // Filter out the current appointment to get the next one
      const nextAppt = data.results.find((appt: any) => appt.id !== Number(appointmentId));
      return nextAppt || null;
    },
    enabled: !!appointment?.patient && !!appointmentId,
  });

  // Auto-populate appointment type as first invoice item
  useEffect(() => {
    if (!appointment || items.length > 0) return;
    
    const appointmentType = appointment.appointment_type;
    const matchedService = clinicServices.find(s => 
      s.name.toLowerCase().includes(appointmentType?.toLowerCase() || '')
    );

    setItems([{
      description: matchedService?.name || appointmentType || '',
      quantity: 1,
      unit_price: matchedService ? Number(matchedService.price) : 0,
    }]);
  }, [appointment, clinicServices]);

  // Load existing invoice items when editing
  useEffect(() => {
    if (!existingInvoice || !appointment) return;
    
    if (existingInvoice.items && existingInvoice.items.length > 0) {
      setItems(existingInvoice.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_percent: Number(item.discount_percent),
        tax_percent: Number(item.tax_percent),
      })));
      setInvoiceDate(existingInvoice.invoice_date);
      setDueDate(existingInvoice.due_date || '');
      setNotes(existingInvoice.notes || '');
    }
  }, [existingInvoice, appointment]);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const discount = item.discount_percent || 0;
      return sum + (itemTotal * discount / 100);
    }, 0);
  };

  const calculateTotalTax = () => {
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const discount = item.discount_percent || 0;
      const afterDiscount = itemTotal - (itemTotal * discount / 100);
      const tax = item.tax_percent || 0;
      return sum + (afterDiscount * tax / 100);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const totalDiscount = calculateTotalDiscount();
  const totalTax = calculateTotalTax();
  const totalAmount = subtotal - totalDiscount + totalTax;

  const calculateTotalPaid = () => {
    return paymentEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  };

  const balanceDue = calculateTotalPaid() > 0 ? totalAmount - calculateTotalPaid() : totalAmount;

  const handleAddPaymentEntry = () => {
    setPaymentEntries([...paymentEntries, { paymentMethod: 'CASH', amount: '', referenceNumber: '' }]);
  };

  const handleRemovePaymentEntry = (index: number) => {
    if (paymentEntries.length > 1) {
      setPaymentEntries(paymentEntries.filter((_, i) => i !== index));
    }
  };

  const handleUpdatePaymentEntry = (index: number, field: keyof PaymentEntry, value: string) => {
    const newEntries = [...paymentEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setPaymentEntries(newEntries);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof EditableItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateItemTotal = (item: EditableItem) => {
    const itemTotal = item.quantity * item.unit_price;
    const afterDiscount = itemTotal - (itemTotal * (item.discount_percent || 0) / 100);
    return afterDiscount * (1 + (item.tax_percent || 0) / 100);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId) throw new Error('No appointment ID');
      
      if (existingInvoice) {
        const keepIds = new Set(items.filter(i => i.id).map(i => i.id!));
        const toDelete = existingInvoice.items.filter(i => !keepIds.has(i.id));
        for (const item of toDelete) {
          await billingApi.deleteItem(item.id);
        }

        for (const item of items.filter(i => i.id)) {
          await billingApi.updateItem(item.id!, {
            description: item.description,
            quantity: String(item.quantity) as any,
            unit_price: String(item.unit_price) as any,
          });
        }

        for (const item of items.filter(i => !i.id)) {
          if (!item.description.trim()) continue;
          await billingApi.addItem(existingInvoice.id, {
            invoice: existingInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          });
        }

        await billingApi.updateInvoice(existingInvoice.id, {
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          notes,
        } as any);

        if (calculateTotalPaid() > 0) {
          for (const entry of paymentEntries) {
            if (entry.amount && Number(entry.amount) > 0) {
              await billingApi.createPayment({
                invoice: existingInvoice.id,
                payment_date: format(new Date(), 'yyyy-MM-dd'),
                amount: Number(entry.amount),
                payment_method: entry.paymentMethod,
                reference_number: entry.referenceNumber,
              });
            }
          }
        }

        return existingInvoice;
      } else {
        const invoice = await billingApi.createFromAppointment({
          appointment: Number(appointmentId),
          invoice_date: invoiceDate,
          due_date: dueDate || undefined,
          notes,
          items: items.filter(i => i.description.trim()).map(i => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        });

        if (calculateTotalPaid() > 0) {
          for (const entry of paymentEntries) {
            if (entry.amount && Number(entry.amount) > 0) {
              await billingApi.createPayment({
                invoice: invoice.id,
                payment_date: format(new Date(), 'yyyy-MM-dd'),
                amount: Number(entry.amount),
                payment_method: entry.paymentMethod,
                reference_number: entry.referenceNumber,
              });
            }
          }
        }

        return invoice;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointment-invoice', appointmentId] });
      qc.invalidateQueries({ queryKey: ['appointment-invoice-exists', appointmentId] });
      if (existingInvoice) {
        toast.success('Invoice Updated Successfully!');
      } else {
        toast.success('Invoice Created Successfully!');
      }
      if (appointment?.patient) {
        navigate(`/clients/${appointment.patient}`);
      } else {
        navigate(-1);
      }
    },
    onError: (error: any) => {
      const detail = error?.response?.data;
      if (typeof detail === 'string') setSaveError(detail);
      else if (detail?.detail) setSaveError(detail.detail);
      else setSaveError('Failed to save invoice. Please try again.');
    },
  });

  if (loadingAppointment || loadingInvoice) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Bar with Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center text-sm text-gray-600">
          <Link to="/appointments" className="hover:text-sky-600 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Appointment
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Generate New Invoice</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {existingInvoice ? `Edit Invoice ${existingInvoice.invoice_number}` : 'New Invoice'}
              </h1>
              <p className="text-sm text-gray-500">
                {appointment?.patient_name || ''} • {appointment ? format(new Date(appointment.date), 'MMM dd, yyyy') : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || items.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saveMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveMutation.isPending ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="mx-6 mt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between flex-shrink-0">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content - 1440px optimized layout */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full grid grid-cols-12 gap-6">
          
          {/* LEFT COLUMN - 7 cols */}
          <div className="col-span-7 space-y-4 overflow-y-auto pr-2">
            {/* Client Information Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-semibold text-gray-900">Client Information</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={appointment?.patient_name || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Patient Number</label>
                  <input
                    type="text"
                    value={String(appointment?.patient) || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Practitioner</label>
                  <input
                    type="text"
                    value={appointment?.practitioner_name || 'Unassigned'}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Appointment Type</label>
                  <input
                    type="text"
                    value={appointment?.appointment_type || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Details Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-semibold text-gray-900">Invoice Details</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Items Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-sky-600" />
                  <h2 className="text-base font-semibold text-gray-900">Invoice Items</h2>
                </div>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 rounded-lg"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 w-[30%]">Description</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 w-[14%]">Qty</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 w-[18%]">Unit Price</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 w-[12%]">Disc %</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 w-[12%]">Tax %</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 w-[14%]">Total</th>
                      <th className="w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-1.5 px-2 w-[30%]">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                            placeholder="Service description"
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                          />
                        </td>
                        <td className="py-1.5 px-2 w-[14%]">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                            min="1"
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-center"
                          />
                        </td>
                        <td className="py-1.5 px-2 w-[18%]">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(index, 'unit_price', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-right"
                          />
                        </td>
                        <td className="py-1.5 px-2 w-[12%]">
                          <input
                            type="number"
                            value={item.discount_percent || 0}
                            onChange={(e) => handleUpdateItem(index, 'discount_percent', Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-center"
                          />
                        </td>
                        <td className="py-1.5 px-2 w-[12%]">
                          <input
                            type="number"
                            value={item.tax_percent || 0}
                            onChange={(e) => handleUpdateItem(index, 'tax_percent', Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-center"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right text-xs font-medium text-gray-900 w-[14%]">
                          ₱{calculateItemTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-1">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-gray-400 text-xs">
                          No items added. Click "Add Item" to add services.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-semibold text-gray-900">Payment Methods</h2>
              </div>

              <div className="space-y-3">
                {paymentEntries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {paymentEntries.length > 1 ? `Method ${index + 1}` : 'Method'}
                      </label>
                      <select
                        value={entry.paymentMethod}
                        onChange={(e) => handleUpdatePaymentEntry(index, 'paymentMethod', e.target.value as PaymentMethod)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                        <option value="DEBIT_CARD">Debit Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="GCASH">GCash</option>
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                      <input
                        type="number"
                        value={entry.amount}
                        onChange={(e) => handleUpdatePaymentEntry(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ref #</label>
                      <input
                        type="text"
                        value={entry.referenceNumber}
                        onChange={(e) => handleUpdatePaymentEntry(index, 'referenceNumber', e.target.value)}
                        placeholder="Optional"
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      {paymentEntries.length > 1 && (
                        <button
                          onClick={() => handleRemovePaymentEntry(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAddPaymentEntry}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 rounded-lg"
                >
                  <Plus className="w-3 h-3" />
                  Add Another Payment
                </button>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-semibold text-gray-900">Notes</h2>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this invoice..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              />
            </div>
          </div>

          {/* RIGHT COLUMN - 5 cols - Invoice Preview only */}
          <div className="col-span-5">
            {/* Invoice Preview / Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-0">
              <div className="flex items-center gap-2 mb-3">
                <Printer className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-semibold text-gray-900">Invoice Preview</h2>
              </div>

              {/* Invoice Preview Card */}
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-xs">
                {/* Header */}
                <div className="flex justify-between items-start pb-2 border-b border-gray-200 mb-2">
                  <div>
                    {clinicProfile?.logo_url ? (
                      <img 
                        src={clinicProfile.logo_url} 
                        alt="Clinic Logo" 
                        className="h-12 mb-1 object-contain"
                      />
                    ) : (
                      <div className="h-12 mb-1 flex items-center justify-center bg-gray-200 rounded text-gray-400 text-xs">
                        No Logo
                      </div>
                    )}
                    <div className="font-bold text-sky-600 text-sm">INVOICE</div>
                    <div className="font-semibold text-gray-700 text-xs">
                      {existingInvoice?.invoice_number || 'INV-YYYY-0000'}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-sky-600">{clinicProfile?.name || 'Clinic Name'}</div>
                    <div className="text-gray-500">
                      {clinicProfile?.address || '123 Address'}
                    </div>
                    <div className="text-gray-500">
                      {clinicProfile?.city && clinicProfile?.province 
                        ? `${clinicProfile.city}, ${clinicProfile.province} ${clinicProfile.postal_code || ''}` 
                        : 'City, Province'}
                    </div>
                    {clinicProfile?.phone && (
                      <div className="text-gray-500">
                        Tel: {clinicProfile.phone}
                      </div>
                    )}
                    {clinicProfile?.email && (
                      <div className="text-gray-500">
                        {clinicProfile.email}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex justify-between py-0.5">
                        <span className="text-gray-500">Invoice Date:</span>
                        <span className="text-gray-700 font-medium">{invoiceDate}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-gray-500">Due Date:</span>
                        <span className="text-gray-700 font-medium">{dueDate || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill To */}
                <div className="mb-2">
                  <div className="font-semibold text-gray-700">Bill To:</div>
                  <div className="text-gray-600">{appointment?.patient_name || 'Patient Name'}</div>
                </div>

                {/* Items Table */}
                <div className="mb-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1 font-medium text-gray-500">Description</th>
                        <th className="text-center py-1 font-medium text-gray-500 w-8">Qty</th>
                        <th className="text-right py-1 font-medium text-gray-500 w-16">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-1 text-gray-900">{item.description || '-'}</td>
                          <td className="py-1 text-center text-gray-600">{item.quantity}</td>
                          <td className="py-1 text-right text-gray-900 font-medium">₱{calculateItemTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 text-center text-gray-400">No items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Calculations */}
                <div className="flex justify-end">
                  <div className="w-full">
                    <div className="flex justify-between py-1 text-gray-600">
                      <span>Subtotal</span>
                      <span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1 text-green-600">
                      <span>Discount (₱{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                      <span>-₱{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1 text-gray-600">
                      <span>GST (₱{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                      <span>+₱{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-t border-gray-200 font-bold text-gray-900">
                      <span>Total</span>
                      <span>₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    {/* Payment Method Breakdown */}
                    {paymentEntries.some(e => e.amount && Number(e.amount) > 0) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="font-semibold text-gray-700 mb-1">Payment Breakdown</div>
                        {paymentEntries.filter(e => e.amount && Number(e.amount) > 0).map((entry, idx) => (
                          <div key={idx} className="flex justify-between py-0.5 text-green-600">
                            <span>{getPaymentMethodLabel(entry.paymentMethod)}</span>
                            <span>₱{Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-1.5 border-t border-gray-200 font-bold text-sky-600">
                          <span>Balance Due</span>
                          <span>₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                {notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</div>
                    <div className="text-xs text-gray-600">{notes}</div>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-center text-xs text-sky-600 font-medium">
                    Thank you for choosing {clinicProfile?.name || 'our clinic'}. We sincerely appreciate the opportunity to provide you with our clinic services. Please contact us if you have any questions regarding this invoice. Kindly settle this invoice within 30 days. We look forward to seeing you again at your next appointment.
                  </div>
                  <div className="mt-2 text-center">
                    {nextAppointment ? (
                      <div className="text-xs text-green-600 font-medium">
                        Next Appointment: {format(new Date(nextAppointment.date), 'yyyy-MM-dd')} {nextAppointment.start_time}
                      </div>
                    ) : (
                      <div className="text-xs text-red-500 font-medium">
                        No Further Appointments
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export { GenerateNewInvoice };
