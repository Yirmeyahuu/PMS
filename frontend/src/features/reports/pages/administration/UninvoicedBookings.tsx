import React, { useState, useCallback } from 'react';
import { FileX, Clock, Stethoscope, Building2, AlertTriangle, FileText } from 'lucide-react';
import {
  getUninvoicedBookings,
  type UninvoicedBookingsResponse,
  type UninvoicedBookingItem,
} from '../../reports.api';
import {
  DateRangePicker,
  StatCard,
  ReportLoading,
  ReportError,
  ReportEmpty,
  ReportHeader,
  AppointmentTypeBadge,
  InvoiceStatusBadge,
  StatusBadge,
  PrintButton,
  openPrintWindow,
  formatDate,
  formatTime,
  todayISO,
  monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';

// ─── Print HTML builder ───────────────────────────────────────────────────────
// Builds print HTML from whatever rows are currently displayed in the table.
// This guarantees the print output always matches what the user sees on screen.

function buildUninvoicedPrintHtml(
  data: UninvoicedBookingsResponse,
  displayedResults: UninvoicedBookingItem[],
  activeFilter:     string,
  statusFilter:     string,
): string {
  const { start_date, end_date, generated_at } = data;

  const total          = displayedResults.length;
  const overdue        = displayedResults.filter((r) => (r.days_since_completed ?? 0) > 7).length;
  const thisWeek       = displayedResults.filter((r) => r.days_since_completed !== null && (r.days_since_completed ?? 0) <= 7).length;
  const noInvoice      = displayedResults.filter((r) => r.invoice_status === null).length;

  const statHtml = `
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total Uninvoiced</div>
      </div>
      <div class="stat">
        <div class="stat-value">${overdue}</div>
        <div class="stat-label">Overdue (&gt;7 days)</div>
      </div>
      <div class="stat">
        <div class="stat-value">${thisWeek}</div>
        <div class="stat-label">This Week (≤7 days)</div>
      </div>
      <div class="stat">
        <div class="stat-value">${noInvoice}</div>
        <div class="stat-label">No Invoice at All</div>
      </div>
    </div>
  `;

  const filterNote = [
    activeFilter !== 'ALL' ? `Invoice filter: ${activeFilter.replace('_', ' ')}` : '',
    statusFilter !== 'ALL' ? `Appt. status: ${statusFilter.replace('_', ' ')}` : '',
  ].filter(Boolean).join(' · ');

  const rowsHtml = displayedResults.map((item) => {
    const fmtDate  = formatDate(item.date);
    const fmtStart = formatTime(item.start_time);
    const fmtEnd   = formatTime(item.end_time);
    const days     = item.days_since_completed;

    let daysBadge = '—';
    let daysCls   = '';
    if (days !== null) {
      daysCls   = days > 14 ? 'badge-red' : days > 7 ? 'badge-orange' : days > 3 ? 'badge-yellow' : 'badge-green';
      daysBadge = `<span class="badge ${daysCls}">${days}d ago</span>`;
    }

    const invoiceBadge = item.invoice_status
      ? `<span class="badge badge-gray">${item.invoice_status}</span>`
      : `<span class="badge badge-red">No Invoice</span>`;

    return `
      <tr>
        <td>
          <div class="time-primary">${fmtDate}</div>
          <div class="time-secondary">${fmtStart} – ${fmtEnd}</div>
        </td>
        <td>
          <div class="patient-name">${item.patient_name}</div>
          <div class="patient-num">#${item.patient_number}</div>
        </td>
        <td>${item.practitioner_name || '—'}</td>
        <td>${item.branch_name || '—'}</td>
        <td>${item.appointment_type.replace(/_/g, ' ')}</td>
        <td>${item.appointment_status.replace(/_/g, ' ')}</td>
        <td>
          ${invoiceBadge}
          ${item.invoice_number ? `<div class="patient-num">${item.invoice_number}</div>` : ''}
        </td>
        <td>${daysBadge}</td>
      </tr>
    `;
  }).join('');

  const emptyRow = `
    <tr>
      <td colspan="8" style="text-align:center; padding: 24px; color: #9ca3af;">
        No records to display.
      </td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Uninvoiced Bookings Report</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #111827; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .header h1 { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .filter-note { font-size: 11px; color: #f97316; font-weight: 600; margin-top: 4px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 700; color: #111827; }
        .stat-label { font-size: 10px; color: #6b7280; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        thead { background: #f3f4f6; }
        th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
        td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f9fafb; }
        .time-primary { font-weight: 600; color: #111827; }
        .time-secondary { font-size: 11px; color: #9ca3af; margin-top: 1px; }
        .patient-name { font-weight: 600; color: #111827; }
        .patient-num { font-size: 11px; color: #9ca3af; margin-top: 1px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
        .badge-red    { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-orange { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .badge-yellow { background: #fefce8; color: #ca8a04; border: 1px solid #fde68a; }
        .badge-green  { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .badge-gray   { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .footer { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
        @media print {
          body { padding: 0; }
          @page { margin: 1.5cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>Uninvoiced Bookings Report</h1>
          <p class="meta">Period: ${formatDate(start_date)} — ${formatDate(end_date)}</p>
          <p class="meta">Generated: ${new Date(generated_at).toLocaleString()}</p>
          ${filterNote ? `<p class="filter-note">Filters: ${filterNote}</p>` : ''}
        </div>
        <div>
          <span class="badge badge-red">${total} Uninvoiced</span>
        </div>
      </div>

      ${statHtml}

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Patient</th>
            <th>Practitioner</th>
            <th>Branch</th>
            <th>Type</th>
            <th>Appt. Status</th>
            <th>Invoice</th>
            <th>Days Since</th>
          </tr>
        </thead>
        <tbody>
          ${displayedResults.length > 0 ? rowsHtml : emptyRow}
        </tbody>
      </table>

      <div class="footer">
        <span>Uninvoiced Bookings Report · ${formatDate(start_date)} to ${formatDate(end_date)}</span>
        <span>Total: ${total} records</span>
      </div>
    </body>
    </html>
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UninvoicedBookings: React.FC = () => {
  const [startDate,    setStartDate]    = useState(monthStart());
  const [endDate,      setEndDate]      = useState(todayISO());
  const [data,         setData]         = useState<UninvoicedBookingsResponse | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isPrinting,   setIsPrinting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [hasRun,       setHasRun]       = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NO_INVOICE' | 'DRAFT' | 'PENDING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // ── Run report ──────────────────────────────────────────────────────────────
  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getUninvoicedBookings({
        start_date: startDate,
        end_date:   endDate,
        status:     statusFilter,
      });

      console.group('%c[UninvoicedBookings] API Response', 'color: orange; font-weight: bold');
      console.log('total_count:',     result.total_count);
      console.log('filters applied:', result.filters);
      console.log('results array:',   result.results);
      // @ts-ignore
      console.log('_debug block:',    result._debug);
      console.groupEnd();

      setData(result);
      setHasRun(true);
      setActiveFilter('ALL');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to generate report';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, statusFilter]);

  // ── Filter (invoice-level) ───────────────────────────────────────────────────
  const filteredResults = (data?.results ?? []).filter((item) => {
    if (activeFilter === 'ALL')        return true;
    if (activeFilter === 'NO_INVOICE') return item.invoice_status === null;
    if (activeFilter === 'DRAFT')      return item.invoice_status === 'DRAFT';
    if (activeFilter === 'PENDING')    return item.invoice_status === 'PENDING';
    return true;
  });

  // ── Print — uses filteredResults already in state ────────────────────────────
  // No extra API call needed. What you see = what you print.
  const handlePrint = useCallback(() => {
    if (!data) return;
    setIsPrinting(true);
    try {
      const html = buildUninvoicedPrintHtml(data, filteredResults, activeFilter, statusFilter);
      openPrintWindow(html, 'Uninvoiced Bookings Report');
    } catch (err: any) {
      toast.error('Failed to generate print preview');
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filteredResults, activeFilter, statusFilter]);

  // ── Color helpers ─────────────────────────────────────────────────────────────
  const getDaysBadgeCls = (days: number | null): string => {
    if (days === null) return 'bg-gray-100 text-gray-500';
    if (days <= 3)  return 'bg-green-50  text-green-700  border border-green-200';
    if (days <= 7)  return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    if (days <= 14) return 'bg-orange-50 text-orange-700 border border-orange-200';
    return 'bg-red-50 text-red-700 border border-red-200';
  };

  const noInvoiceCount = data?.results.filter((r) => r.invoice_status === null).length  ?? 0;
  const draftCount     = data?.results.filter((r) => r.invoice_status === 'DRAFT').length  ?? 0;
  const pendingCount   = data?.results.filter((r) => r.invoice_status === 'PENDING').length ?? 0;

  return (
    <div className="flex flex-col h-full">

      {/* ── Controls ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 space-y-3">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onApply={run}
          isLoading={isLoading}
        />

        {/* ── Appointment Status Filter pills ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium flex-shrink-0">Appt. Status:</span>
          {(['ALL', 'COMPLETED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'SCHEDULED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {isLoading ? (
          <ReportLoading />
        ) : error ? (
          <ReportError message={error} onRetry={run} />
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-200">
              <FileX className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Uninvoiced Bookings Report</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Select a date range and click <strong>Run Report</strong> to see appointments
              that have not yet been invoiced or only have a draft invoice.
            </p>
          </div>
        ) : !data || data.total_count === 0 ? (
          <ReportEmpty message="No uninvoiced bookings found for the selected date range." />
        ) : (
          <>
            {/* ── Report Header ── */}
            <ReportHeader
              title="Uninvoiced Bookings"
              description="Appointments with no invoice or only a draft/pending invoice"
              startDate={data.start_date}
              endDate={data.end_date}
              icon={<FileX className="w-5 h-5" />}
              totalBadge={
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {data.total_count} uninvoiced
                </span>
              }
              actions={
                <PrintButton
                  onClick={handlePrint}
                  isLoading={isPrinting}
                  label="Print Report"
                />
              }
            />

            {/* ── Stats (based on full result set) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard
                label="Total Uninvoiced"
                value={data.total_count}
                color="text-red-700"
                bg="bg-red-50"
                border="border-red-200"
                icon={<FileX className="w-4 h-4" />}
              />
              <StatCard
                label="No Invoice"
                value={noInvoiceCount}
                color="text-rose-700"
                bg="bg-rose-50"
                border="border-rose-200"
                icon={<AlertTriangle className="w-4 h-4" />}
              />
              <StatCard
                label="Draft / Pending"
                value={draftCount + pendingCount}
                color="text-yellow-700"
                bg="bg-yellow-50"
                border="border-yellow-200"
                icon={<FileText className="w-4 h-4" />}
              />
              <StatCard
                label="Overdue (&gt;7 days)"
                value={data.results.filter((r) => (r.days_since_completed ?? 0) > 7).length}
                color="text-orange-700"
                bg="bg-orange-50"
                border="border-orange-200"
                icon={<Clock className="w-4 h-4" />}
              />
            </div>

            {/* ── Invoice-level Filter Tabs ── */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {([
                { key: 'ALL',        label: `All (${data.total_count})` },
                { key: 'NO_INVOICE', label: `No Invoice (${noInvoiceCount})` },
                { key: 'DRAFT',      label: `Draft Only (${draftCount})` },
                { key: 'PENDING',    label: `Pending (${pendingCount})` },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFilter === key
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Practitioner</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Appt. Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Invoice</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Days Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                          No results match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((item: UninvoicedBookingItem) => (
                        <tr key={item.appointment_id} className="hover:bg-gray-50 transition-colors">

                          {/* Date */}
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{formatDate(item.date)}</p>
                            <p className="text-xs text-gray-400">
                              {formatTime(item.start_time)} – {formatTime(item.end_time)}
                            </p>
                          </td>

                          {/* Patient */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {item.patient_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{item.patient_name}</p>
                                <p className="text-xs text-gray-400">#{item.patient_number}</p>
                              </div>
                            </div>
                          </td>

                          {/* Practitioner */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <Stethoscope className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-sm">{item.practitioner_name || '—'}</span>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="px-4 py-3">
                            {item.branch_name ? (
                              <div className="flex items-center gap-1 text-gray-600 text-sm">
                                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                {item.branch_name}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3">
                            <AppointmentTypeBadge type={item.appointment_type} />
                          </td>

                          {/* Appointment Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={item.appointment_status} />
                          </td>

                          {/* Invoice Status */}
                          <td className="px-4 py-3">
                            <InvoiceStatusBadge status={item.invoice_status} />
                            {item.invoice_number && (
                              <p className="text-xs text-gray-400 mt-0.5">{item.invoice_number}</p>
                            )}
                          </td>

                          {/* Days Since */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDaysBadgeCls(item.days_since_completed)}`}>
                              {item.days_since_completed !== null
                                ? `${item.days_since_completed}d`
                                : '—'}
                            </span>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing <strong>{filteredResults.length}</strong> of{' '}
                  <strong>{data.total_count}</strong> uninvoiced bookings
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(data.start_date)} – {formatDate(data.end_date)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};