import React from 'react';
import { Loader2, AlertCircle, InboxIcon, Printer } from 'lucide-react';

// ─── Date helpers ─────────────────────────────────────────────────────────────

export const todayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const monthStart = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

export const formatDate = (iso: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    });
  } catch {
    return iso;
  }
};

export const formatTime = (t: string): string => {
  if (!t) return '—';
  try {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  } catch {
    return t;
  }
};

export const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
      hour:  'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

// ─── Print utility ────────────────────────────────────────────────────────────

/**
 * Opens a new window, injects print-ready HTML, and triggers window.print().
 * The entire page styling is self-contained inside the new window so no
 * Tailwind or external CSS is required.
 */
export const openPrintWindow = (html: string, title: string): void => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body   { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #111827; background: #fff; padding: 24px; }
        h1     { font-size: 18px; font-weight: 700; color: #111827; }
        h2     { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 4px; }
        p      { color: #6b7280; font-size: 11px; }
        .header         { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .header-left h1 { margin-bottom: 4px; }
        .meta           { font-size: 11px; color: #6b7280; }
        .badge          { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
        .badge-red      { background: #fee2e2; color: #b91c1c; }
        .badge-orange   { background: #ffedd5; color: #c2410c; }
        .badge-yellow   { background: #fef9c3; color: #a16207; }
        .badge-green    { background: #dcfce7; color: #15803d; }
        .badge-blue     { background: #dbeafe; color: #1d4ed8; }
        .badge-gray     { background: #f3f4f6; color: #4b5563; }
        .stats          { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat           { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        .stat-value     { font-size: 22px; font-weight: 700; color: #111827; }
        .stat-label     { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
        table           { width: 100%; border-collapse: collapse; margin-top: 8px; }
        thead th        { background: #f9fafb; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
        tbody td        { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        tbody tr:last-child td { border-bottom: none; }
        .patient-name   { font-weight: 600; color: #111827; font-size: 12px; }
        .patient-num    { font-size: 10px; color: #9ca3af; }
        .time-primary   { font-weight: 600; color: #111827; }
        .time-secondary { font-size: 10px; color: #9ca3af; }
        .reason-text    { max-width: 180px; font-size: 11px; color: #374151; }
        .no-reason      { font-size: 10px; color: #9ca3af; font-style: italic; }
        .footer         { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; display: flex; justify-content: space-between; }
        @media print {
          body { padding: 12px; }
          @page { margin: 12mm; size: A4 landscape; }
        }
      </style>
    </head>
    <body>
      ${html}
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 300);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
};

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  startDate:     string;
  endDate:       string;
  onStartChange: (v: string) => void;
  onEndChange:   (v: string) => void;
  onApply:       () => void;
  isLoading:     boolean;
  extra?:        React.ReactNode;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate, endDate, onStartChange, onEndChange, onApply, isLoading, extra,
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">Date From</label>
      <input
        type="date"
        value={startDate}
        max={endDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
      />
    </div>
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">Date To</label>
      <input
        type="date"
        value={endDate}
        min={startDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
      />
    </div>
    {extra}
    <button
      onClick={onApply}
      disabled={isLoading}
      className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
    >
      {isLoading ? (
        <><Loader2 className="w-4 h-4 animate-spin" />Running...</>
      ) : (
        'Run Report'
      )}
    </button>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:  string;
  value:  number | string;
  color:  string;
  bg:     string;
  border: string;
  icon?:  React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, color, bg, border, icon }) => (
  <div className={`${bg} ${border} border rounded-xl p-4 flex items-start gap-3`}>
    {icon && (
      <div className={`flex-shrink-0 mt-0.5 ${color}`}>{icon}</div>
    )}
    <div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

// ─── Report Header ────────────────────────────────────────────────────────────

interface ReportHeaderProps {
  title:       string;
  description: string;
  startDate:   string;
  endDate:     string;
  icon:        React.ReactNode;
  totalBadge?: React.ReactNode;
  actions?:    React.ReactNode;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title, description, startDate, endDate, icon, totalBadge, actions,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(startDate)} — {formatDate(endDate)}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      {totalBadge}
      {actions}
    </div>
  </div>
);

// ─── Print Button ─────────────────────────────────────────────────────────────

interface PrintButtonProps {
  onClick:    () => void;
  isLoading?: boolean;
  label?:     string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  onClick, isLoading = false, label = 'Print Report',
}) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
  >
    {isLoading
      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
      : <Printer className="w-3.5 h-3.5" />
    }
    {label}
  </button>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:    'bg-blue-50   text-blue-700   border-blue-200',
  CONFIRMED:    'bg-sky-50    text-sky-700    border-sky-200',
  CHECKED_IN:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_PROGRESS:  'bg-violet-50 text-violet-700 border-violet-200',
  COMPLETED:    'bg-green-50  text-green-700  border-green-200',
  CANCELLED:    'bg-red-50    text-red-700    border-red-200',
  NO_SHOW:      'bg-orange-50 text-orange-700 border-orange-200',
  DRAFT:        'bg-gray-50   text-gray-600   border-gray-200',
  PENDING:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  PAID:         'bg-green-50  text-green-700  border-green-200',
  PARTIALLY_PAID: 'bg-teal-50 text-teal-700   border-teal-200',
  OVERDUE:      'bg-red-50    text-red-700    border-red-200',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// ─── Invoice Status Badge ─────────────────────────────────────────────────────

export const InvoiceStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
        No Invoice
      </span>
    );
  }
  const cls = STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
};

// ─── Appointment Type Badge ───────────────────────────────────────────────────

const TYPE_STYLES: Record<string, string> = {
  INITIAL:    'bg-purple-50 text-purple-700 border-purple-200',
  FOLLOW_UP:  'bg-blue-50   text-blue-700   border-blue-200',
  THERAPY:    'bg-teal-50   text-teal-700   border-teal-200',
  ASSESSMENT: 'bg-amber-50  text-amber-700  border-amber-200',
};

const TYPE_LABELS: Record<string, string> = {
  INITIAL:    'Initial',
  FOLLOW_UP:  'Follow-up',
  THERAPY:    'Therapy',
  ASSESSMENT: 'Assessment',
};

export const AppointmentTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const cls   = TYPE_STYLES[type]  ?? 'bg-gray-50 text-gray-600 border-gray-200';
  const label = TYPE_LABELS[type]  ?? type;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
};

// ─── Loading / Error / Empty ─────────────────────────────────────────────────

export const ReportLoading: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    <p className="text-sm text-gray-500 font-medium">Generating report…</p>
  </div>
);

interface ReportErrorProps {
  message: string;
  onRetry: () => void;
}

export const ReportError: React.FC<ReportErrorProps> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center border border-red-200">
      <AlertCircle className="w-7 h-7 text-red-500" />
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-red-700 mb-1">Failed to load report</p>
      <p className="text-xs text-gray-500 max-w-xs">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="text-xs text-orange-600 hover:text-orange-700 font-medium underline underline-offset-2"
    >
      Try again
    </button>
  </div>
);

interface ReportEmptyProps {
  message?: string;
}

export const ReportEmpty: React.FC<ReportEmptyProps> = ({
  message = 'No data found for the selected date range.',
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-200">
      <InboxIcon className="w-7 h-7 text-gray-400" />
    </div>
    <p className="text-sm font-semibold text-gray-600">No Results</p>
    <p className="text-xs text-gray-400 text-center max-w-xs">{message}</p>
  </div>
);