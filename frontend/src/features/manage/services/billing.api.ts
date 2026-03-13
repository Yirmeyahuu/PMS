import axiosInstance from '@/lib/axios';
import type {
  Invoice,
  InvoiceBatch,
  BulkInvoiceRequest,
  BulkPreviewResponse,
} from '@/types/billing';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Individual Invoice API (re-exports for manage pages that need it) ────────

export const invoiceApi = {
  /** GET /api/invoices/by_appointment/{id}/ */
  getByAppointment: (appointmentId: number) =>
    axiosInstance.get(`/invoices/by_appointment/${appointmentId}/`).then(r => r.data),

  /** POST /api/invoices/create_from_appointment/ */
  create: async (payload: {
    appointment: number;
    patient?: number;
    clinic?: number;
    invoice_date: string;
    due_date?: string;
    notes?: string;
  }): Promise<Invoice> => {
    const { data } = await axiosInstance.post('/invoices/create_from_appointment/', payload);
    return data;
  },

  /** POST /api/invoices/{id}/update_status/ */
  updateStatus: async (id: number, newStatus: string): Promise<Invoice> => {
    const { data } = await axiosInstance.post(`/invoices/${id}/update_status/`, { status: newStatus });
    return data;
  },

  /** Open print view */
  print: (id: number): void => {
    window.open(`/invoices/${id}/print`, '_blank');
  },
};

// ── Bulk Invoicing API ───────────────────────────────────────────────────────

export const bulkInvoicingApi = {
  /** POST /api/invoice-batches/create_bulk/ with dry_run=true */
  preview: async (request: BulkInvoiceRequest): Promise<BulkPreviewResponse> => {
    const { data } = await axiosInstance.post('/invoice-batches/create_bulk/', {
      ...request,
      dry_run: true,
    });
    return data;
  },

  /** POST /api/invoice-batches/create_bulk/ with dry_run=false */
  run: async (request: BulkInvoiceRequest): Promise<InvoiceBatch> => {
    const { data } = await axiosInstance.post('/invoice-batches/create_bulk/', {
      ...request,
      dry_run: false,
    });
    return data;
  },

  /** GET /api/invoice-batches/ */
  listBatches: async (): Promise<PaginatedResponse<InvoiceBatch>> => {
    const { data } = await axiosInstance.get('/invoice-batches/');
    return data;
  },

  /** GET /api/invoice-batches/{id}/ */
  getBatch: async (id: number): Promise<InvoiceBatch> => {
    const { data } = await axiosInstance.get(`/invoice-batches/${id}/`);
    return data;
  },
};

// ── Print Appointments API ───────────────────────────────────────────────────

export const printAppointmentsApi = {
  /** GET /api/appointments-print/ */
  list: async (params?: Record<string, any>): Promise<PaginatedResponse<any>> => {
    const { data } = await axiosInstance.get('/appointments-print/', { params });
    return data;
  },

  /** GET /api/appointments-print/summary/ */
  summary: async (params?: Record<string, any>): Promise<any> => {
    const { data } = await axiosInstance.get('/appointments-print/summary/', { params });
    return data;
  },

  /** GET /api/appointments-print/payload/ */
  payload: async (params?: Record<string, any>): Promise<any> => {
    const { data } = await axiosInstance.get('/appointments-print/payload/', { params });
    return data;
  },
};