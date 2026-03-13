// ── Shared ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED'
  | 'CANCELLED' | 'NO_SHOW';

export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type PaymentMethod =
  | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER'
  | 'GCASH' | 'PAYMAYA' | 'CHECK';

// ── Print Appointments ────────────────────────────────────────────────────────

export interface AppointmentPrintRecord {
  id:                        number;
  date:                      string;
  start_time:                string;
  end_time:                  string;
  duration_minutes:          number;
  status:                    AppointmentStatus;
  status_display:            string;
  appointment_type:          string;
  appointment_type_display:  string;
  patient_id:                number;
  patient_name:              string;
  patient_number:            string;
  practitioner_id:           number | null;
  practitioner_name:         string;
  clinic_id:                 number;
  clinic_name:               string;
  location_name:             string;
  chief_complaint:           string;
  has_invoice:               boolean;
}

export interface AppointmentPrintSummary {
  total:     number;
  by_status: Record<AppointmentStatus, number>;
}

export interface AppointmentPrintPayload extends AppointmentPrintSummary {
  by_practitioner: Record<string, number>;
  by_branch:       Record<string, number>;
  appointments:    AppointmentPrintRecord[];
}

export interface AppointmentPrintFilters {
  date_from?:     string;
  date_to?:       string;
  date?:          string;
  clinic?:        number;
  practitioner?:  number;
  status?:        AppointmentStatus[];
  patient_name?:  string;
  ordering?:      string;
}

// ── Bulk Invoicing ────────────────────────────────────────────────────────────

export interface BulkInvoiceRequest {
  date_from:         string;
  date_to:           string;
  clinic_ids?:       number[];
  status_filter?:    AppointmentStatus[];
  invoice_date?:     string;
  due_date?:         string;
  discount_percent?: number;
  tax_percent?:      number;
  skip_existing?:    boolean;
  dry_run?:          boolean;
}

export interface BulkPreviewItem {
  appointment_id:        number;
  date:                  string;
  start_time:            string;
  patient_name:          string;
  patient_number:        string;
  clinic_name:           string;
  practitioner:          string;
  appointment_type:      string;
  estimated_unit_price:  number;
}

export interface BulkPreviewResponse {
  dry_run:            true;
  total_appointments: number;
  preview:            BulkPreviewItem[];
  preview_capped_at:  number;
}

export interface InvoiceBatch {
  id:                    number;
  batch_number:          string;
  clinic:                number;
  clinic_name:           string;
  created_by:            number | null;
  created_by_name:       string | null;
  status:                BatchStatus;
  status_display:        string;
  date_from:             string;
  date_to:               string;
  clinic_ids:            number[];
  filters_used:          Record<string, unknown>;
  total_appointments:    number;
  total_created:         number;
  total_skipped:         number;
  total_failed:          number;
  error_log:             { appointment_id: number; error: string }[];
  total_invoiced_amount: string;
  created_at:            string;
}

// ── Single Invoice (Individual — from AppointmentView / AppointmentModal) ─────

export interface InvoiceItem {
  id:               number;
  invoice:          number;
  description:      string;
  quantity:         string;
  unit_price:       string;
  discount_percent: string;
  tax_percent:      string;
  total:            string;
  service_code:     string;
  created_at:       string;
  updated_at:       string;
}

export interface Invoice {
  id:                  number;
  invoice_number:      string;
  clinic:              number;
  clinic_name:         string;
  patient:             number;
  patient_name:        string;
  patient_number:      string;
  appointment:         number | null;
  appointment_date:    string | null;
  appointment_start_time: string | null;
  bulk_batch:          number | null;
  created_by:          number | null;
  created_by_name:     string | null;

  invoice_date:        string;
  due_date:            string | null;
  status:              InvoiceStatus;
  status_display:      string;

  subtotal:            string;
  discount_amount:     string;
  discount_percent:    string;
  tax_amount:          string;
  tax_percent:         string;
  total_amount:        string;
  amount_paid:         string;
  balance_due:         string;

  payment_method:      string;
  payment_notes:       string;
  philhealth_coverage: string;
  hmo_coverage:        string;
  notes:               string;
  terms_conditions:    string;

  items:               InvoiceItem[];
  created_at:          string;
  updated_at:          string;
}

/**
 * Payload for creating an individual invoice from an appointment.
 * Used by AppointmentView → "Generate Invoice" button.
 */
export interface CreateInvoiceFromAppointmentPayload {
  appointment:   number;
  patient?:      number;
  clinic?:       number;
  invoice_date:  string;
  due_date?:     string;
  notes?:        string;
  items?:        CreateInvoiceItemPayload[];
}

/**
 * Payload for creating a generic invoice (not tied to an appointment).
 * Used by the Invoices list page.
 */
export interface CreateInvoicePayload {
  appointment?:     number;
  patient:          number;
  clinic:           number;
  invoice_date:     string;
  due_date?:        string;
  discount_percent?: number;
  tax_percent?:     number;
  notes?:           string;
  inline_items?:    CreateInvoiceItemPayload[];
}

/** Payload for creating / updating a single line item. */
export interface CreateInvoiceItemPayload {
  id?:              number;
  description:      string;
  quantity:         number;
  unit_price:       number;
  discount_percent?: number;
  tax_percent?:     number;
  service_code?:    string;
}

// ── Invoice Filters (for list pages) ──────────────────────────────────────────

export interface InvoiceFilters {
  status?:       InvoiceStatus | InvoiceStatus[];
  date_from?:    string;
  date_to?:      string;
  patient_name?: string;
  clinic?:       number;
  appointment?:  number;
  bulk_batch?:   number;
  search?:       string;
  page?:         number;
  page_size?:    number;
  ordering?:     string;
}

// ── Invoice Stats ─────────────────────────────────────────────────────────────

export interface InvoiceStats {
  total_invoiced: number;
  total_paid:     number;
  total_balance:  number;
  count:          number;
  by_status:      { status: InvoiceStatus; count: number; total: number }[];
}

// ── Payment ───────────────────────────────────────────────────────────────────

export interface Payment {
  id:               number;
  invoice:          number;
  invoice_number:   string;
  payment_date:     string;
  amount:           string;
  payment_method:   PaymentMethod;
  reference_number: string;
  notes:            string;
  receipt_number:   string;
  received_by:      number | null;
  received_by_name: string | null;
  created_at:       string;
  updated_at:       string;
}

export interface CreatePaymentPayload {
  invoice:           number;
  payment_date:      string;
  amount:            number;
  payment_method:    PaymentMethod;
  reference_number?: string;
  notes?:            string;
}

// ── Service Catalog ───────────────────────────────────────────────────────────

export interface Service {
  id:            number;
  clinic:        number;
  name:          string;
  description:   string;
  service_code:  string;
  default_price: string;
  category:      string;
  is_active:     boolean;
  created_at:    string;
  updated_at:    string;
}

// ── Paginated Response (generic) ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}