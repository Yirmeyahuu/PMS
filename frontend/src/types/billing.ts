// ── Shared ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED'
  | 'CANCELLED' | 'NO_SHOW';

export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

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
  id:                   number;
  batch_number:         string;
  clinic:               number;
  clinic_name:          string;
  created_by:           number | null;
  created_by_name:      string | null;
  status:               BatchStatus;
  status_display:       string;
  date_from:            string;
  date_to:              string;
  clinic_ids:           number[];
  filters_used:         Record<string, unknown>;
  total_appointments:   number;
  total_created:        number;
  total_skipped:        number;
  total_failed:         number;
  error_log:            { appointment_id: number; error: string }[];
  total_invoiced_amount: string;
  created_at:           string;
}


// ── Single Invoice ────────────────────────────────────────────────────────────
export type InvoiceItemType = 'SERVICE' | 'PRODUCT' | 'CUSTOM';

export interface InvoiceItem {
  id:           number;
  description:  string;
  item_type:    InvoiceItemType;
  quantity:     number;
  unit_price:   string;
  discount:     string;
  tax:          string;
  total:        string;
}

export interface Invoice {
  id:               number;
  invoice_number:   string;
  appointment:      number | null;
  patient:          number;
  patient_name:     string;
  patient_number:   string;
  clinic:           number;
  clinic_name:      string;
  status:           InvoiceStatus;
  status_display:   string;
  invoice_date:     string;
  due_date:         string | null;
  subtotal:         string;
  discount_amount:  string;
  tax_amount:       string;
  total_amount:     string;
  amount_paid:      string;
  balance_due:      string;
  notes:            string;
  items:            InvoiceItem[];
  created_at:       string;
  created_by_name:  string | null;
}

export interface CreateInvoicePayload {
  appointment:      number;
  patient:          number;
  clinic:           number;
  invoice_date:     string;
  due_date?:        string;
  discount_amount?: string;
  tax_amount?:      string;
  notes?:           string;
  items?:           Omit<InvoiceItem, 'id' | 'total'>[];
}