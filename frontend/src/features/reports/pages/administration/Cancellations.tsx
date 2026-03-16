import React, { useState, useCallback } from 'react';
import { UserX, XCircle, AlertTriangle, Stethoscope, Building2, Info, MessageSquare } from 'lucide-react';
import {
  getCancellations,
  getCancellationsPrint,
  type CancellationsResponse,
  type CancellationItem,
  type CancellationsPrintResponse,
} from '../../reports.api';
import {
  DateRangePicker,
  StatCard,
  ReportLoading,
  ReportError,
  ReportEmpty,
  ReportHeader,
  StatusBadge,
  AppointmentTypeBadge,
  PrintButton,
  openPrintWindow,
  formatDate,
  formatTime,
  formatDateTime,
  todayISO,
  monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';

// ─── Print HTML builder ───────────────────────────────────────────────────────

function buildCancellationsPrintHtml(data: CancellationsPrintResponse): string {
  const { summary, results, start_date, end_date, total_count,
          cancelled_count, no_show_count, generated_at } = data;

  const statHtml = `
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${total_count}</div>
        <div class="stat-label">Total Records</div>
      </div>
      <div class="stat">
        <div class="stat-value">${cancelled_count}</div>
        <div class="stat-label">Cancelled</div>
      </div>
      <div class="stat">
        <div class="stat-value">${no_show_count}</div>
        <div class="stat-label">No Show</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.with_reason_count}</div>
        <div class="stat-label">With Reason</div>
      </div>
    </div>
  `;

  const rowsHtml = results.map((item) => {
    const statusCls = item.status === 'CANCELLED' ? 'badge-red' : 'badge-orange';
    const reasonHtml = item.reason
      ? `<span class="reason-text">${item.reason}</span>`
      : `<span class="no-reason">No reason provided</span>`;
    const cancelledAtHtml = item.cancelled_at
      ? `<div class="time-secondary">${new Date(item.cancelled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</div>`
      : '';

    return `
      <tr>
        <td>
          <div class="time-primary">${formatDate(item.date)}</div>
          <div class="time-secondary">${formatTime(item.start_time)}</div>
          ${cancelledAtHtml}
        </td>
        <td>
          <div class="patient-name">${item.patient_name}</div>
          <div class="patient-num">#${item.patient_number}</div>
        </td>
        <td>${item.practitioner_name || '—'}</td>
        <td>${item.branch_name || '—'}</td>
        <td>${item.appointment_type.replace(/_/g, ' ')}</td>
        <td>
          <span class="badge ${statusCls}">${item.status.replace(/_/g, ' ')}</span>
          ${item.cancelled_by ? `<div class="patient-num">by ${item.cancelled_by}</div>` : ''}
        </td>
        <td>${reasonHtml}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="header">
      <div class="header-left">
        <h1>Cancellations Report</h1>
        <p class="meta">Period: ${formatDate(start_date)} — ${formatDate(end_date)}</p>
        <p class="meta">Generated: ${new Date(generated_at).toLocaleString()}</p>
      </div>
      <div>
        <span class="badge badge-red">${total_count} Records</span>
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
          <th>Status</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <div class="footer">
      <span>Cancellations Report · ${formatDate(start_date)} to ${formatDate(end_date)}</span>
      <span>${cancelled_count} Cancelled · ${no_show_count} No Show · Total: ${total_count}</span>
    </div>
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Cancellations: React.FC = () => {
  const [startDate,    setStartDate]    = useState(monthStart());
  const [endDate,      setEndDate]      = useState(todayISO());
  const [includeNoShow, setIncludeNoShow] = useState(true);
  const [data,         setData]         = useState<CancellationsResponse | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isPrinting,   setIsPrinting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [hasRun,       setHasRun]       = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CANCELLED' | 'NO_SHOW'>('ALL');

  // ── Run report ──────────────────────────────────────────────────────────────
  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCancellations({
        start_date:      startDate,
        end_date:        endDate,
        include_no_show: includeNoShow,
      });
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
  }, [startDate, endDate, includeNoShow]);

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(async () => {
    setIsPrinting(true);
    try {
      const printData = await getCancellationsPrint({
        start_date:      startDate,
        end_date:        endDate,
        include_no_show: includeNoShow,
      });
      const html = buildCancellationsPrintHtml(printData);
      openPrintWindow(html, 'Cancellations Report');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate print preview');
    } finally {
      setIsPrinting(false);
    }
  }, [startDate, endDate, includeNoShow]);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredResults = (data?.results ?? []).filter((item) => {
    if (activeFilter === 'ALL')       return true;
    if (activeFilter === 'CANCELLED') return item.status === 'CANCELLED';
    if (activeFilter === 'NO_SHOW')   return item.status === 'NO_SHOW';
    return true;
  });

  const withReasonCount    = filteredResults.filter((r) => r.reason).length;
  const withoutReasonCount = filteredResults.filter((r) => !r.reason).length;

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
          extra={
            <label className="inline-flex items-center gap-2 cursor-pointer select-none self-end pb-1.5">
              <input
                type="checkbox"
                checked={includeNoShow}
                onChange={(e) => setIncludeNoShow(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
              />
              <span className="text-sm text-gray-600 font-medium">Include No-Shows</span>
            </label>
          }
        />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {isLoading ? (
          <ReportLoading />
        ) : error ? (
          <ReportError message={error} onRetry={run} />
        ) : !hasRun ? (
          /* ── Idle state ── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-200">
              <UserX className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Cancellations Report</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Select a date range and click <strong>Run Report</strong> to view cancelled
              and no-show appointments.
            </p>
          </div>
        ) : !data || data.total_count === 0 ? (
          <ReportEmpty message="No cancellations found for the selected date range." />
        ) : (
          <>
            {/* ── Report Header ── */}
            <ReportHeader
              title="Cancellations Report"
              description="Cancelled appointments and no-shows in the selected period"
              startDate={data.start_date}
              endDate={data.end_date}
              icon={<UserX className="w-5 h-5" />}
              totalBadge={
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
                  <UserX className="w-3.5 h-3.5" />
                  {data.total_count} records
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

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard
                label="Total"
                value={data.total_count}
                color="text-gray-900"
                bg="bg-white"
                border="border-gray-200"
                icon={<UserX className="w-4 h-4" />}
              />
              <StatCard
                label="Cancelled"
                value={data.cancelled_count}
                color="text-red-700"
                bg="bg-red-50"
                border="border-red-200"
                icon={<XCircle className="w-4 h-4" />}
              />
              <StatCard
                label="No Show"
                value={data.no_show_count}
                color="text-orange-700"
                bg="bg-orange-50"
                border="border-orange-200"
                icon={<AlertTriangle className="w-4 h-4" />}
              />
              <StatCard
                label="With Reason"
                value={withReasonCount}
                color="text-teal-700"
                bg="bg-teal-50"
                border="border-teal-200"
                icon={<MessageSquare className="w-4 h-4" />}
              />
            </div>

            {/* ── Filter Tabs ── */}
            <div className="flex gap-2 mb-4">
              {([
                { key: 'ALL',       label: `All (${data.total_count})` },
                { key: 'CANCELLED', label: `Cancelled (${data.cancelled_count})` },
                { key: 'NO_SHOW',   label: `No Show (${data.no_show_count})` },
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Cancelled By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResults.map((item: CancellationItem) => (
                      <tr key={item.appointment_id} className="hover:bg-gray-50 transition-colors">

                        {/* Date */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{formatDate(item.date)}</p>
                          <p className="text-xs text-gray-400">{formatTime(item.start_time)}</p>
                          {item.cancelled_at && (
                            <p className="text-xs text-red-400 mt-0.5">
                              Cancelled: {formatDateTime(item.cancelled_at)}
                            </p>
                          )}
                        </td>

                        {/* Patient */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>

                        {/* Cancelled By */}
                        <td className="px-4 py-3">
                          {item.cancelled_by ? (
                            <p className="text-sm text-gray-700">{item.cancelled_by}</p>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3 max-w-[200px]">
                          {item.reason ? (
                            <p
                              className="text-xs text-gray-600 truncate"
                              title={item.reason}
                            >
                              {item.reason}
                            </p>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <Info className="w-3 h-3" />
                              No reason
                            </span>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing <strong>{filteredResults.length}</strong> of{' '}
                  <strong>{data.total_count}</strong> records
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