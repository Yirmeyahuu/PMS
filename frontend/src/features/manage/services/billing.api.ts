import axiosInstance from '@/lib/axios';
import type {
  AppointmentPrintFilters,
  AppointmentPrintPayload,
  AppointmentPrintRecord,
  AppointmentPrintSummary,
  BulkInvoiceRequest,
  BulkPreviewResponse,
  InvoiceBatch,
  Invoice,
  CreateInvoicePayload,
} from '@/types/billing';

// ── Paginated list response ───────────────────────────────────────────────────
interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

// ── helpers ───────────────────────────────────────────────────────────────────
function toParams(filters: AppointmentPrintFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.date_from)    p.date_from    = filters.date_from;
  if (filters.date_to)      p.date_to      = filters.date_to;
  if (filters.date)         p.date         = filters.date;
  if (filters.clinic)       p.clinic       = String(filters.clinic);
  if (filters.practitioner) p.practitioner = String(filters.practitioner);
  if (filters.patient_name) p.patient_name = filters.patient_name;
  if (filters.ordering)     p.ordering     = filters.ordering;
  if (filters.status?.length) p.status     = filters.status.join(',');
  return p;
}

// ── Print Appointments API ────────────────────────────────────────────────────
export const appointmentPrintApi = {
  /**
   * Paginated list — used for the preview table in the UI.
   */
  list: async (
    filters: AppointmentPrintFilters = {},
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResponse<AppointmentPrintRecord>> => {
    const res = await axiosInstance.get('/appointments-print/', {
      params: { ...toParams(filters), page, page_size: pageSize },
    });
    // Support both paginated and plain array responses
    if (Array.isArray(res.data)) {
      return { count: res.data.length, next: null, previous: null, results: res.data };
    }
    return res.data;
  },

  /**
   * Aggregate counts for header stats.
   */
  summary: async (
    filters: AppointmentPrintFilters = {},
  ): Promise<AppointmentPrintSummary> => {
    const res = await axiosInstance.get('/appointments-print/summary/', {
      params: toParams(filters),
    });
    return res.data;
  },

  /**
   * Full payload for browser print / export — no pagination.
   */
  payload: async (
    filters: AppointmentPrintFilters = {},
  ): Promise<AppointmentPrintPayload> => {
    const res = await axiosInstance.get('/appointments-print/payload/', {
      params: toParams(filters),
    });
    return res.data;
  },
};

// ── Bulk Invoicing API ────────────────────────────────────────────────────────
export const bulkInvoicingApi = {
  /**
   * Dry-run: preview what WOULD be invoiced.
   */
  preview: async (req: BulkInvoiceRequest): Promise<BulkPreviewResponse> => {
    const res = await axiosInstance.post('/invoice-batches/create_bulk/', {
      ...req,
      dry_run: true,
    });
    return res.data;
  },

  /**
   * Execute the bulk invoicing run.
   */
  run: async (req: BulkInvoiceRequest): Promise<InvoiceBatch> => {
    const res = await axiosInstance.post('/invoice-batches/create_bulk/', {
      ...req,
      dry_run: false,
    });
    return res.data;
  },

  /**
   * List all past batches.
   */
  listBatches: async (
    status?: string,
    page = 1,
  ): Promise<PaginatedResponse<InvoiceBatch>> => {
    const res = await axiosInstance.get('/invoice-batches/', {
      params: { ...(status ? { status } : {}), page },
    });
    if (Array.isArray(res.data)) {
      return { count: res.data.length, next: null, previous: null, results: res.data };
    }
    return res.data;
  },

  /**
   * Get a single batch by ID.
   */
  getBatch: async (id: number): Promise<InvoiceBatch> => {
    const res = await axiosInstance.get(`/invoice-batches/${id}/`);
    return res.data;
  },
};

// ── Single Invoice API ────────────────────────────────────────────────────────
export const invoiceApi = {
  /**
   * Get invoice(s) for a specific appointment.
   */
  getByAppointment: async (appointmentId: number): Promise<Invoice | null> => {
    const res = await axiosInstance.get('/invoices/', {
      params: { appointment: appointmentId },
    });
    const results = Array.isArray(res.data) ? res.data : res.data.results ?? [];
    return results[0] ?? null;
  },

  /**
   * Get a single invoice by ID.
   */
  getById: async (id: number): Promise<Invoice> => {
    const res = await axiosInstance.get(`/invoices/${id}/`);
    return res.data;
  },

  /**
   * Create a new invoice.
   */
  create: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const res = await axiosInstance.post('/invoices/', payload);
    return res.data;
  },

  /**
   * Update invoice status (e.g. mark as PAID).
   */
  updateStatus: async (id: number, status: string): Promise<Invoice> => {
    const res = await axiosInstance.patch(`/invoices/${id}/`, { status });
    return res.data;
  },

  /**
   * Print / download invoice as PDF.
   */
  print: (id: number) => {
    window.open(`/api/invoices/${id}/pdf/`, '_blank');
  },
};