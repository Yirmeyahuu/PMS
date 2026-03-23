import axiosInstance from '@/lib/axios';
import type { Invoice, InvoiceItem, Payment, InvoiceStats } from '@/types/billing';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface InvoiceFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  patient_name?: string;
  clinic?: number;
  appointment?: number;
  bulk_batch?: number;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface ClinicService {
  id: number;
  clinic: number;
  clinic_name: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: string;
  image_url: string | null;
  color_hex: string;
  sort_order: number;
  is_active: boolean;
  show_in_portal: boolean;
}

export const billingApi = {

  // ── Invoices ─────────────────────────────────────────────────────────────

  /** GET /api/invoices/ — paginated list with filters */
  getInvoices: async (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> => {
    const { data } = await axiosInstance.get('/invoices/', { params: filters });
    return data;
  },

  /** GET /api/invoices/{id}/ */
  getInvoice: async (id: number): Promise<Invoice> => {
    const { data } = await axiosInstance.get(`/invoices/${id}/`);
    return data;
  },

  /** GET /api/invoices/by-appointment/{appointmentId}/ */
  getByAppointment: async (appointmentId: number): Promise<Invoice | null> => {
    try {
      const { data } = await axiosInstance.get(`/invoices/by-appointment/${appointmentId}/`);
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /**
   * POST /api/invoices/create-from-appointment/
   */
  createFromAppointment: async (payload: {
    appointment: number;
    patient?: number;
    clinic?: number;
    invoice_date: string;
    due_date?: string;
    notes?: string;
    items?: {
      description: string;
      quantity: number;
      unit_price: number;
      service_code?: string;
    }[];
  }): Promise<Invoice> => {
    const { data } = await axiosInstance.post('/invoices/create-from-appointment/', payload);
    return data;
  },

  /** POST /api/invoices/ — generic create */
  createInvoice: async (payload: Partial<Invoice>): Promise<Invoice> => {
    const { data } = await axiosInstance.post('/invoices/', payload);
    return data;
  },

  /** PATCH /api/invoices/{id}/ */
  updateInvoice: async (id: number, payload: Partial<Invoice>): Promise<Invoice> => {
    const { data } = await axiosInstance.patch(`/invoices/${id}/`, payload);
    return data;
  },

  /** DELETE /api/invoices/{id}/ */
  deleteInvoice: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/invoices/${id}/`);
  },

  /** POST /api/invoices/{id}/mark-paid/ */
  markPaid: async (
    id: number,
    payload?: { payment_method?: string; payment_reference?: string }
  ): Promise<Invoice> => {
    const { data } = await axiosInstance.post(`/invoices/${id}/mark-paid/`, payload ?? {});
    return data;
  },

  /** POST /api/invoices/{id}/update-status/ */
  updateStatus: async (id: number, newStatus: string): Promise<Invoice> => {
    const { data } = await axiosInstance.post(`/invoices/${id}/update-status/`, { status: newStatus });
    return data;
  },

  /** POST /api/invoices/{id}/add-item/ */
  addItem: async (
    invoiceId: number,
    item: { 
      description: string; 
      quantity: number;  // ← Expect number
      unit_price: number;  // ← Expect number
      invoice: number 
    }
  ): Promise<Invoice> => {
    const payload = {
      ...item,
      quantity: item.quantity,
      unit_price: item.unit_price,
    };
    const { data } = await axiosInstance.post(`/invoices/${invoiceId}/add-item/`, payload);
    return data;
  },

  /** GET /api/invoices/stats/ */
  getStats: async (filters?: InvoiceFilters): Promise<InvoiceStats> => {
    const { data } = await axiosInstance.get('/invoices/stats/', { params: filters });
    return data;
  },

  // ── Invoice Items ────────────────────────────────────────────────────────

  /** PATCH /api/invoice-items/{id}/ */
  updateItem: async (id: number, payload: Partial<InvoiceItem>): Promise<InvoiceItem> => {
    const { data } = await axiosInstance.patch(`/invoice-items/${id}/`, payload);
    return data;
  },

  /** DELETE /api/invoice-items/{id}/ */
  deleteItem: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/invoice-items/${id}/`);
  },

  // ── Payments ─────────────────────────────────────────────────────────────

  /** GET /api/payments/?invoice={id} */
  getPayments: async (invoiceId: number): Promise<PaginatedResponse<Payment>> => {
    const { data } = await axiosInstance.get('/payments/', { params: { invoice: invoiceId } });
    return data;
  },

  /** POST /api/payments/ */
  createPayment: async (payload: {
    invoice: number;
    payment_date: string;
    amount: number;
    payment_method: string;
    reference_number?: string;
    notes?: string;
  }): Promise<Payment> => {
    const { data } = await axiosInstance.post('/payments/', payload);
    return data;
  },

  // ── Clinic Services ──────────────────────────────────────────────────────

  /** GET /api/clinic-services/ — active services for price lookup */
  getClinicServices: async (): Promise<ClinicService[]> => {
    const { data } = await axiosInstance.get('/clinic-services/', {
      params: { is_active: true, page_size: 100 },
    });
    return data.results ?? data;
  },

  // ── Print ────────────────────────────────────────────────────────────────

  /**
   * Open printable invoice in a new browser tab.
   * Uses the Django-rendered HTML template via the API endpoint.
   * The auth token is passed as a query param since window.open can't set headers.
   */
  print: (id: number): void => {
    // Build the full URL to the Django API print endpoint
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
    const token   = localStorage.getItem('access_token') || '';
    const url     = `${baseURL}/invoices/${id}/print/?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  },
}; 