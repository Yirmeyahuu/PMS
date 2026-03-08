import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Calendar, ChevronDown } from 'lucide-react';

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  startDate:       string;
  endDate:         string;
  onStartChange:   (v: string) => void;
  onEndChange:     (v: string) => void;
  onApply:         () => void;
  isLoading?:      boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate, endDate, onStartChange, onEndChange, onApply, isLoading,
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
    <button
      onClick={onApply}
      disabled={isLoading}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-60 transition-colors"
    >
      {isLoading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <RefreshCw className="w-4 h-4" />
      }
      {isLoading ? 'Loading...' : 'Run Report'}
    </button>
  </div>
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:      string;
  value:      number | string;
  color?:     string;
  bg?:        string;
  border?:    string;
  icon?:      React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value,
  color  = 'text-gray-900',
  bg     = 'bg-white',
  border = 'border-gray-200',
  icon,
}) => (
  <div className={`${bg} border ${border} rounded-xl p-4`}>
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className={color}>{icon}</span>}
      <p className="text-xs text-gray-500">{label}</p>
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

// ─── Loading State ────────────────────────────────────────────────────────────

export const ReportLoading: React.FC = () => (
  <div className="flex-1 flex items-center justify-center py-20">
    <div className="text-center">
      <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500">Generating report...</p>
    </div>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────

interface ReportErrorProps { message: string; onRetry: () => void; }
export const ReportError: React.FC<ReportErrorProps> = ({ message, onRetry }) => (
  <div className="flex-1 flex items-center justify-center py-20">
    <div className="text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-1">Failed to load report</p>
      <p className="text-xs text-gray-500 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

interface ReportEmptyProps { message?: string; }
export const ReportEmpty: React.FC<ReportEmptyProps> = ({
  message = 'No records found for the selected date range.',
}) => (
  <div className="flex-1 flex items-center justify-center py-20">
    <div className="text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-7 h-7 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  </div>
);

// ─── Report Header (title + date range info) ─────────────────────────────────

interface ReportHeaderProps {
  title:       string;
  description: string;
  startDate:   string;
  endDate:     string;
  icon:        React.ReactNode;
  totalBadge?: React.ReactNode;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title, description, startDate, endDate, icon, totalBadge,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center text-orange-600">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      {totalBadge}
      {startDate && endDate && (
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
          {new Date(startDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {' — '}
          {new Date(endDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )}
    </div>
  </div>
);

// ─── Collapsible row ─────────────────────────────────────────────────────────

interface CollapsibleRowProps {
  summary:  React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const CollapsibleRow: React.FC<CollapsibleRowProps> = ({
  summary, children, defaultOpen = false,
}) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        {summary}
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-gray-200 bg-gray-50/50">{children}</div>}
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:    'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:    'bg-sky-50 text-sky-700 border-sky-200',
  CHECKED_IN:   'bg-purple-50 text-purple-700 border-purple-200',
  IN_PROGRESS:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED:    'bg-green-50 text-green-700 border-green-200',
  CANCELLED:    'bg-red-50 text-red-700 border-red-200',
  NO_SHOW:      'bg-orange-50 text-orange-700 border-orange-200',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked In',
  IN_PROGRESS: 'In Progress', COMPLETED: 'Completed',
  CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Initial', FOLLOW_UP: 'Follow-up',
  THERAPY: 'Therapy', ASSESSMENT: 'Assessment',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
    {STATUS_LABELS[status] ?? status}
  </span>
);

export const AppointmentTypeBadge: React.FC<{ type: string }> = ({ type }) => (
  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
    {APPOINTMENT_TYPE_LABELS[type] ?? type}
  </span>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatDate = (d: string) =>
  new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatTime = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const todayISO   = () => new Date().toISOString().split('T')[0];
export const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};