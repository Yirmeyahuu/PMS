// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
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
  StickyNote,
  } from 'lucide-react';
import { billingApi, type ClinicService } from './billing.api';
import { getMyClinic, type ClinicProfile } from '@/features/clinics/clinic.api';
import { productApi } from '@/features/setup/pages/items/services/inventory.api';
import type { ProductListItem, StockAdjustmentPayload, CreateProductPayload } from '@/types/inventory';
import { ProductFormModal } from '@/features/setup/pages/items/components/ProductFormModal';
import { Package } from 'lucide-react';
import type {
  Invoice,
  PaymentMethod
} from '@/types/billing';
import axiosInstance from '@/lib/axios';
import type { Appointment } from '@/types/appointment';
import toast from 'react-hot-toast';
import { PMSInvoiceTemplate, type InvoiceClinicInfo, type NextAppointmentInfo } from '@/components/invoices/PMSInvoiceTemplate';
import { PHILIPPINE_BANKS, requiresBankSelection } from '@/data/philippineBanks';
import { getPatientCases, getCasePaymentSummary, type CasePaymentSummary } from '@/features/patients/patientCases.api';

interface EditableItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  inventoryProductId?: number;
}

interface PaymentEntry {
  id?: number;
  paymentMethod: PaymentMethod;
  bankName: string;
  amount: string;
  referenceNumber: string;
}

export default function GenerateNewInvoice() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [accountNotes, setAccountNotes] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);

  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([
    { paymentMethod: 'CASH', bankName: '', amount: '', referenceNumber: '' },
    { paymentMethod: 'DEBIT_CARD', bankName: '', amount: '', referenceNumber: '' },
    { paymentMethod: 'CREDIT_CARD', bankName: '', amount: '', referenceNumber: '' },
    { paymentMethod: 'CHECK', bankName: '', amount: '', referenceNumber: '' },
    { paymentMethod: 'GCASH', bankName: '', amount: '', referenceNumber: '' },
  ]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inventoryDropdownIndex, setInventoryDropdownIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [createItemTargetIndex, setCreateItemTargetIndex] = useState<number | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInventoryDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: appointment, isLoading: loadingAppointment } = useQuery<Appointment>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/appointments/${appointmentId}/`);
      return data;
    },
    enabled: !!appointmentId,
  });

  const { data: patientData } = useQuery({
    queryKey: ['patient-details', appointment?.patient],
    queryFn: async () => {
      if (!appointment?.patient) return null;
      const { data } = await axiosInstance.get(`/patients/${appointment.patient}/`);
      return data;
    },
    enabled: !!appointment?.patient,
  });

  // Pre-fill accountNotes when patient data is loaded
  useEffect(() => {
    if (patientData?.account_notes) {
      setAccountNotes(patientData.account_notes);
    }
  }, [patientData]);

  // This query will be placed after patientCase query is defined.

  const { data: clinicServices = [] } = useQuery<ClinicService[]>({
    queryKey: ['clinic-services'],
    queryFn: () => billingApi.getClinicServices(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: patientCase } = useQuery({
    queryKey: ['patient-cases', appointment?.patient],
    queryFn: async () => {
      const cases = await getPatientCases(appointment!.patient);
      return cases.find(c => c.id === appointment!.patient_case) ?? null;
    },
    enabled: !!appointment?.patient && !!appointment?.patient_case,
  });

  const { data: casePaymentSummary } = useQuery<CasePaymentSummary | null>({
    queryKey: ['case-payment-summary', appointment?.patient_case],
    queryFn: () => getCasePaymentSummary(appointment!.patient_case!),
    enabled: !!appointment?.patient_case && appointment?.session_limit_source === 'PACKAGE',
  });

  const { data: existingInvoice, isLoading: loadingInvoice } = useQuery<Invoice | null>({
    queryKey: ['appointment-invoice', Number(appointmentId)],
    queryFn: async () => {
      return billingApi.getByAppointment(Number(appointmentId));
    },
    enabled: !!appointmentId && (appointment?.patient_case ? patientCase !== undefined : true),
  });



  const { data: clinicProfile } = useQuery<ClinicProfile>({
    queryKey: ['my-clinic'],
    queryFn: getMyClinic,
    staleTime: 10 * 60 * 1000,
  });

  const { data: inventoryProducts = [] } = useQuery<ProductListItem[]>({
    queryKey: ['inventory-products-active'],
    queryFn: async () => {
      const res = await productApi.list({ is_archived: false, page_size: 500 });
      return res.results;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createProductMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) => productApi.create(payload),
    onSuccess: (newProduct) => {
      qc.invalidateQueries({ queryKey: ['inventory-products-active'] });
      if (createItemTargetIndex !== null) {
        setItems(prev => {
          const updated = [...prev];
          updated[createItemTargetIndex] = {
            ...updated[createItemTargetIndex],
            description: newProduct.name,
            unit_price: Number(newProduct.selling_price) || 0,
            inventoryProductId: newProduct.id,
          };
          return updated;
        });
        setInventoryDropdownIndex(null);
      }
      setShowCreateItemModal(false);
      setCreateItemTargetIndex(null);
      toast.success(`"${newProduct.name}" created and added to invoice`);
    },
  });

  const createProductError = (() => {
    const err = createProductMutation.error as any;
    if (!err) return null;
    const data = err?.response?.data;
    if (!data) return null;
    if (typeof data === 'string') return data;
    return (Object.values(data) as any[]).flat().join(' ');
  })();

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
    
    // For subsequent package appointments, we still add the item so the invoice isn't blank,
    // but we will force its price to 0 later before adding it to state.
    const isSubsequentPackage = appointment.is_covered_by_package && (appointment.package_invoices_count || 0) > 0;

    // First try to match by exact service ID if available
    let matchedService = undefined;
    if (appointment.service) {
      matchedService = clinicServices.find(s => s.id === appointment.service);
    }

    // Fallback to matching by appointment_type string
    if (!matchedService) {
      const appointmentType = appointment.appointment_type;
      matchedService = clinicServices.find(s =>
        s.name.toLowerCase().includes(appointmentType?.toLowerCase() || '')
      );
    }

    const description = matchedService?.name || appointment.service_name || appointment.appointment_type || '';

    setItems([{
      description: isSubsequentPackage ? `${description} (Covered by Package)` : description,
      quantity: 1,
      unit_price: isSubsequentPackage ? 0 : (matchedService ? Number(matchedService.price) : 0),
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

  const totalPaid = calculateTotalPaid();
  const balanceDue = Math.max(0, totalAmount - totalPaid);
  
  // isPackageBilling: true if this appointment belongs to a PACKAGE case
  const isPackageBilling = appointment?.session_limit_source === 'PACKAGE';
  // Package-level summary comes from case payment summary (all invoices in the case)
  const packageTotal = Number(casePaymentSummary?.package_total ?? patientCase?.package_cost ?? 0);
  const packageAlreadyPaid = Number(casePaymentSummary?.total_paid ?? 0);
  const packageOutstanding = Number(casePaymentSummary?.outstanding_balance ?? packageTotal);
  // Real-time preview: deduct current session payment entry from outstanding
  const packageOutstandingPreview = Math.max(0, packageOutstanding - totalPaid);
  const packagePaidPreview = packageAlreadyPaid + totalPaid;

  const calculateItemTotal = (item: EditableItem) => {
    const itemTotal = item.quantity * item.unit_price;
    const afterDiscount = itemTotal - (itemTotal * (item.discount_percent || 0) / 100);
    return afterDiscount * (1 + (item.tax_percent || 0) / 100);
  };

  // Build a preview Invoice object from local state for PMSInvoiceTemplate
  const previewInvoice: Invoice = {
    id: existingInvoice?.id ?? 0,
    invoice_number: existingInvoice?.invoice_number ?? 'INV-DRAFT',
    clinic: existingInvoice?.clinic ?? 0,
    clinic_name: clinicProfile?.name ?? '',
    patient: appointment?.patient ?? 0,
    patient_name: appointment?.patient_name ?? '',
    patient_number: String(appointment?.patient ?? ''),
    appointment: appointment?.id ?? null,
    appointment_date: appointment?.date ?? null,
    appointment_start_time: appointment?.start_time ?? null,
    appointment_practitioner_name: null,
    appointment_service_name: null,
    bulk_batch: null,
    created_by: null,
    created_by_name: null,
    modified_by: null,
    modified_by_name: null,
    version_number: existingInvoice?.version_number ?? 1,
    invoice_date: invoiceDate,
    due_date: dueDate || null,
    status: isPackageBilling ? 
      (packageOutstandingPreview <= 0 ? 'PAID' : packagePaidPreview > 0 ? 'PARTIALLY_PAID' : 'DRAFT') :
      (totalPaid >= totalAmount && totalAmount > 0 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'DRAFT'),
    status_display: isPackageBilling ?
      (packageOutstandingPreview <= 0 ? 'Paid' : packagePaidPreview > 0 ? 'Partially Paid' : 'Draft') :
      (totalPaid >= totalAmount && totalAmount > 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Draft'),
    subtotal: subtotal.toFixed(2),
    discount_amount: totalDiscount.toFixed(2),
    discount_percent: '0',
    tax_amount: totalTax.toFixed(2),
    tax_percent: '0',
    total_amount: totalAmount.toFixed(2),
    amount_paid: totalPaid.toFixed(2),
    balance_due: balanceDue.toFixed(2),
    payment_method: '',
    payment_notes: '',
    philhealth_coverage: '0',
    hmo_coverage: '0',
    notes: notes,
    terms_conditions: '',
    items: items.map((item, idx) => ({
      id: item.id ?? idx,
      invoice: existingInvoice?.id ?? 0,
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      discount_percent: String(item.discount_percent ?? 0),
      tax_percent: String(item.tax_percent ?? 0),
      total: calculateItemTotal(item).toFixed(2),
      service_code: '',
      created_at: '',
      updated_at: '',
    })),
    payments: paymentEntries
      .filter(e => e.amount && Number(e.amount) > 0)
      .map((e, idx) => ({
        id: idx,
        invoice: existingInvoice?.id ?? 0,
        invoice_number: existingInvoice?.invoice_number ?? '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        amount: String(e.amount),
        payment_method: e.paymentMethod,
        bank_name: e.bankName,
        reference_number: e.referenceNumber,
        notes: '',
        receipt_number: '',
        received_by: null,
        received_by_name: null,
        created_at: '',
        updated_at: '',
      })),
    created_at: existingInvoice?.created_at ?? '',
    updated_at: '',
  };

  const previewClinicInfo: InvoiceClinicInfo | undefined = clinicProfile ? {
    name: clinicProfile.name,
    address: [clinicProfile.address, clinicProfile.city, clinicProfile.province, clinicProfile.postal_code].filter(Boolean).join(', '),
    phone: clinicProfile.phone,
    email: clinicProfile.email,
    website: clinicProfile.website,
    tinNumber: clinicProfile.tin,
    logoUrl: clinicProfile.logo_url ?? undefined,
  } : undefined;

  const previewNextAppointment: NextAppointmentInfo | null = nextAppointment
    ? { date: nextAppointment.date, start_time: nextAppointment.start_time ?? '' }
    : null;

  const handleAddPaymentEntry = () => {
    setPaymentEntries([...paymentEntries, { paymentMethod: 'CASH', bankName: '', amount: '', referenceNumber: '' }]);
  };

  const handleRemovePaymentEntry = (index: number) => {
    if (paymentEntries.length > 1) {
      setPaymentEntries(paymentEntries.filter((_, i) => i !== index));
    }
  };

  const handleUpdatePaymentEntry = (index: number, field: keyof PaymentEntry, value: string) => {
    const newEntries = [...paymentEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    // Clear bank name when switching to a non-card payment method
    if (field === 'paymentMethod' && !requiresBankSelection(value)) {
      newEntries[index].bankName = '';
    }
    setPaymentEntries(newEntries);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleSelectInventoryItem = (index: number, product: ProductListItem) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      description: product.name,
      unit_price: Number(product.selling_price) || 0,
      inventoryProductId: product.id,
    };
    setItems(newItems);
    setInventoryDropdownIndex(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof EditableItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    // Clear inventory link if user manually edits description
    if (field === 'description') {
      newItems[index].inventoryProductId = undefined;
    }
    setItems(newItems);
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
          account_notes: accountNotes,
        } as any);

        if (calculateTotalPaid() > 0) {
          for (const entry of paymentEntries) {
            if (entry.amount && Number(entry.amount) > 0) {
              await billingApi.createPayment({
                invoice: existingInvoice.id,
                payment_date: format(new Date(), 'yyyy-MM-dd'),
                amount: Number(entry.amount),
                payment_method: entry.paymentMethod,
                bank_name: entry.bankName || undefined,
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
          account_notes: accountNotes,
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
                bank_name: entry.bankName || undefined,
                reference_number: entry.referenceNumber,
              });
            }
          }
        }

        return invoice;
      }
    },
    onSuccess: async (invoice) => {
      // Deduct inventory stock for items linked to inventory products
      const inventoryItems = items.filter(i => i.inventoryProductId && i.quantity > 0);
      for (const item of inventoryItems) {
        try {
          const payload: StockAdjustmentPayload = {
            movement_type: 'OUT',
            quantity: String(item.quantity),
            reference: invoice?.invoice_number || '',
            notes: `Invoice ${invoice?.invoice_number || ''} - ${item.description}`,
          };
          await productApi.adjustStock(item.inventoryProductId!, payload);
        } catch {
          toast.error(`Failed to deduct stock for "${item.description}"`);
        }
      }

      qc.invalidateQueries({ queryKey: ['appointment-invoice', Number(appointmentId)] });
      qc.invalidateQueries({ queryKey: ['appointment-invoice-exists', Number(appointmentId)] });
      qc.invalidateQueries({ queryKey: ['inventory-products-active'] });
      if (existingInvoice) {
        toast.success('Invoice Updated Successfully!');
      } else {
        toast.success('Invoice Created Successfully!');
      }
      if (appointment?.patient) {
        navigate(`/patients/${appointment.patient}/invoices`);
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
    <div className="min-h-screen bg-gray-50 flex flex-col py-6">
      {/* Top Bar with Breadcrumb */}
      <div className="max-w-5xl mx-auto w-full px-4 mb-4">
        <div className="flex items-center text-sm text-gray-700 font-medium">
          <span>Generate New Invoice</span>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          <span>{appointment?.patient_name || 'Client Name'}</span>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          <span>[{appointmentId}]</span>
        </div>
      </div>

      {saveError && (
        <div className="max-w-5xl mx-auto w-full px-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Workspace */}
      <div className="flex-1 overflow-hidden px-4">
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          
          <h1 className="text-2xl font-black text-gray-900 mb-8">NEW INVOICE</h1>

          {/* Client Information Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
            <div className="flex justify-between border-b border-gray-300 pb-2">
              <span className="text-sm text-gray-600">Client:</span>
              <span className="text-sm font-semibold text-gray-900 uppercase">{appointment?.patient_name || ''}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-2">
              <span className="text-sm text-gray-600">Invoice Date:</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="text-sm font-semibold text-gray-900 uppercase bg-transparent text-right outline-none cursor-pointer"
              />
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-2">
              <span className="text-sm text-gray-600">Practitioner:</span>
              <span className="text-sm font-semibold text-gray-900 uppercase">{appointment?.practitioner_name || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-2">
              <span className="text-sm text-gray-600">Practitioner ID:</span>
              <span className="text-sm font-semibold text-gray-900 uppercase">{appointment?.practitioner || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-2">
              <span className="text-sm text-gray-600">Appointment:</span>
              <span className="text-sm font-semibold text-gray-900 uppercase">
                {appointment ? format(new Date(appointment.date), 'MMM dd, yyyy') : ''} | {appointment?.start_time ? format(new Date(`1970-01-01T${appointment.start_time}`), 'hh:mm a') : ''} | {appointment?.duration_minutes} mins | {appointment?.appointment_type}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-2">
              <span className="text-sm text-gray-600">Payer Type:</span>
              <span className="text-sm font-semibold text-gray-900 uppercase">{patientCase?.payer || 'Private'}</span>
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="mb-10">
            <h2 className="text-sm font-black text-gray-900 mb-4 uppercase">INVOICE DETAILS</h2>
            
            <div className="overflow-visible mb-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-900">
                    <th className="text-left py-2 px-2 text-sm font-bold text-gray-900 w-[30%]">Items</th>
                    <th className="text-center py-2 px-2 text-sm font-bold text-gray-900 w-[10%]">QTY.</th>
                    <th className="text-center py-2 px-2 text-sm font-bold text-gray-900 w-[15%]">Price</th>
                    <th className="text-center py-2 px-2 text-sm font-bold text-gray-900 w-[15%]">Discount</th>
                    <th className="text-center py-2 px-2 text-sm font-bold text-gray-900 w-[15%]">Subtotal</th>
                    <th className="text-center py-2 px-2 text-sm font-bold text-gray-900 w-[10%]">GST</th>
                    <th className="text-right py-2 px-2 text-sm font-bold text-gray-900 w-[15%]">TOTAL</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const isDropdownOpen = inventoryDropdownIndex === index;
                    const query = item.description.toLowerCase();
                    const filteredProducts = query.length > 0
                      ? inventoryProducts.filter(p => p.name.toLowerCase().includes(query))
                      : inventoryProducts;
                    const linkedProduct = item.inventoryProductId
                      ? inventoryProducts.find(p => p.id === item.inventoryProductId)
                      : null;
                    const itemSubtotal = item.quantity * item.unit_price;

                    return (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2 px-2 w-[30%] align-top">
                          <div className="relative" ref={isDropdownOpen ? dropdownRef : undefined}>
                            <div className="relative">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  handleUpdateItem(index, 'description', e.target.value);
                                  setInventoryDropdownIndex(index);
                                }}
                                onFocus={() => setInventoryDropdownIndex(index)}
                                placeholder="Description"
                                className="w-full px-2 py-2 text-sm bg-gray-100 rounded border-none focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                            {linkedProduct && (
                              <div className={`mt-1 text-[10px] flex items-center gap-1 ${Number(linkedProduct.quantity_in_stock) < item.quantity ? 'text-red-500' : 'text-gray-400'}`}>
                                <Package className="w-3 h-3" />
                                Stock: {Number(linkedProduct.quantity_in_stock).toLocaleString()} {linkedProduct.unit.toLowerCase()}
                              </div>
                            )}
                            {isDropdownOpen && (
                              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                                <div className="max-h-40 overflow-y-auto">
                                  {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className="w-full text-left px-2 py-2 text-sm hover:bg-sky-50 flex justify-between"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectInventoryItem(index, p);
                                      }}
                                    >
                                      <span>{p.name}</span>
                                      <span className="text-gray-500">₱{Number(p.selling_price).toLocaleString()}</span>
                                    </button>
                                  )) : (
                                    <div className="px-2 py-2 text-sm text-gray-400">Start typing...</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 w-[10%] align-top">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                            min="1"
                            className="w-full px-2 py-2 text-sm bg-gray-100 rounded border-none focus:ring-1 focus:ring-sky-500 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[15%] align-top">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(index, 'unit_price', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-2 text-sm bg-gray-100 rounded border-none focus:ring-1 focus:ring-sky-500 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[15%] align-top">
                          <input
                            type="number"
                            value={item.discount_percent || 0}
                            onChange={(e) => handleUpdateItem(index, 'discount_percent', Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-full px-2 py-2 text-sm bg-gray-100 rounded border-none focus:ring-1 focus:ring-sky-500 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[15%] align-top">
                          <div className="w-full px-2 py-2 text-sm bg-gray-100 rounded text-center text-gray-600 font-medium h-9 flex items-center justify-center">
                            ₱{itemSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-2 px-2 w-[10%] align-top">
                          <input
                            type="number"
                            value={item.tax_percent || 0}
                            onChange={(e) => handleUpdateItem(index, 'tax_percent', Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-full px-2 py-2 text-sm bg-gray-100 rounded border-none focus:ring-1 focus:ring-sky-500 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[15%] align-top">
                          <div className="w-full px-2 py-2 text-sm bg-gray-100 rounded text-right text-gray-900 font-medium h-9 flex items-center justify-end">
                            ₱{calculateItemTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-2 px-1 align-top pt-3">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-gray-400 text-sm">
                        No items added. Click "Add item" to add services.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold text-sm rounded transition-colors"
            >
              Add item
            </button>
          </div>

          <div className="border-t-2 border-gray-900 mb-8 w-full"></div>

          {/* Payment Methods and Summary */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            {/* Payment Methods */}
            <div>
              <h2 className="text-sm font-black text-gray-900 mb-4 uppercase">PAYMENT METHODS</h2>
              <div className="space-y-3">
                {paymentEntries.map((entry, index) => {
                  const displayMap: Record<string, string> = {
                    'CASH': 'CASH',
                    'DEBIT_CARD': 'DEBIT CARD',
                    'CREDIT_CARD': 'CREDIT CARD',
                    'CHECK': 'CHEQUE',
                    'GCASH': 'GCASH',
                  };
                  return (
                    <div key={index}>
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <span className="text-sm font-semibold text-gray-900">{displayMap[entry.paymentMethod] || entry.paymentMethod}</span>
                        <input
                          type="number"
                          value={entry.amount}
                          onChange={(e) => handleUpdatePaymentEntry(index, 'amount', e.target.value)}
                          placeholder=""
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-1.5 text-sm bg-gray-200 border border-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      {/* Bank Details conditionally shown if amount > 0 and requires bank */}
                      {requiresBankSelection(entry.paymentMethod) && Number(entry.amount) > 0 && (
                        <div className="grid grid-cols-2 gap-4 items-center mt-2 pl-4">
                          <span className="text-xs text-gray-500">Bank / Ref #</span>
                          <div className="flex gap-2">
                            <select
                              value={entry.bankName}
                              onChange={(e) => handleUpdatePaymentEntry(index, 'bankName', e.target.value)}
                              className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value="">Select bank...</option>
                              {PHILIPPINE_BANKS.map((bank) => (
                                <option key={bank.code} value={bank.code}>{bank.shortName}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={entry.referenceNumber}
                              onChange={(e) => handleUpdatePaymentEntry(index, 'referenceNumber', e.target.value)}
                              placeholder="Ref #"
                              className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="pl-12">
              <h2 className="text-sm font-black text-gray-900 mb-4 uppercase">SUMMARY</h2>
              <div className="space-y-2">
                {isPackageBilling ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Package Subtotal:</span>
                      <span className="text-sm font-semibold text-gray-900">₱{packageTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Total Amount Paid:</span>
                      <span className="text-sm font-semibold text-emerald-600">₱{packagePaidPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {totalPaid > 0 && (
                      <div className="flex justify-between text-xs text-emerald-500 -mt-1">
                        <span></span>
                        <span>+ ₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} this session</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 pt-2">
                      <span className="text-sm text-gray-700">Package Balance Due:</span>
                      <span className="text-sm font-bold text-gray-900">₱{packageOutstandingPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Subtotal:</span>
                      <span className="text-sm font-semibold text-gray-900">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Tax Amount:</span>
                      <span className="text-sm font-semibold text-gray-900">₱{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-300">
                      <span className="text-sm text-gray-700">Total Amount:</span>
                      <span className="text-sm font-bold text-gray-900">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Total Amount Paid:</span>
                      <span className="text-sm font-semibold text-emerald-600">₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-300">
                      <span className="text-sm text-gray-700">Balance Due:</span>
                      <span className="text-sm font-bold text-gray-900">₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-300 mb-8 w-full"></div>

          {/* Notes Section */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h2 className="text-sm font-black text-gray-900 mb-4 uppercase">INVOICE NOTES</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes specifically for this invoice..."
                className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 mb-4 uppercase">ACCOUNT NOTES</h2>
              <textarea
                value={accountNotes}
                onChange={(e) => setAccountNotes(e.target.value)}
                placeholder="Persistent notes for this patient's account..."
                className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none bg-amber-50 border-amber-200"
              />
            </div>
          </div>

          <div className="border-t-2 border-gray-900 pt-6 flex justify-end gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-400 text-gray-700 font-bold text-sm rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || (items.length === 0 && !isPackageBilling)}
              className="px-6 py-2 bg-gray-900 text-white font-bold text-sm rounded hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saveMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              {saveMutation.isPending ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Create Inventory Item Modal ── */}
      <ProductFormModal
        isOpen={showCreateItemModal}
        onClose={() => {
          setShowCreateItemModal(false);
          setCreateItemTargetIndex(null);
          createProductMutation.reset();
        }}
        onSubmit={(data) => createProductMutation.mutate(data)}
        isLoading={createProductMutation.isPending}
        error={createProductError}
      />
    </div>
  );
}
export { GenerateNewInvoice };
