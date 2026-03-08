import React, { useState, useCallback } from 'react';
import { UserX, XCircle, AlertTriangle, Stethoscope, Building2, Clock, Info } from 'lucide-react';
import {
  getCancellations,
  type CancellationsResponse,
  type CancellationItem,
} from '../../reports.api';
import {
  DateRangePicker, StatCard, ReportLoading, ReportError, ReportEmpty,
  ReportHeader, StatusBadge, AppointmentTypeBadge,
  formatDate, formatTime, todayISO, monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';

export const Cancellations: React.FC = () => {
  const [startDate,       setStartDate]       = useState(monthStart());
  const [endDate,         setEndDate]         = useState(todayISO());
  const [includeNoShow,   setIncludeNoShow]   = useState(true);
  const [data,            setData]            = useState<CancellationsResponse | null>(null);
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [hasRun,          setHasRun]          = useState(false);
  const [activeFilter,    setActiveFilter]    = useState<'ALL' | 'CANCELLED' | 'NO_SHOW'>('ALL');

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

  const filteredResults = (data?.results ?? []).filter((item) => {
    if (activeFilter === 'ALL')       return true;
    if (activeFilter === 'CANCELLED') return item.status === 'CANCELLED';
    if (activeFilter === 'NO_SHOW')   return item.status === 'NO_SHOW';
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 space-y-3">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onApply={run}
          isLoading={isLoading}
        />
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeNoShow}
            onChange={(e) => setIncludeNoShow(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
          />
          <span className="text-sm text-gray-600 font-medium">Include No-Shows</span>
        </label>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <ReportLoading />
        ) : error ? (
          <ReportError message={error} onRetry={run} />
        ) : !hasRun ? (
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
            <ReportHeader
              title="Cancellations"
              description="Cancelled appointments and no-shows in the selected period"
              startDate={data.start_date}
              endDate={data.end_date}
              icon={<UserX className="w-5 h-5" />}
              totalBadge={
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
                  <UserX className="w-3.5 h-3.5" />
                  {data.total_count} total
                </span>
              }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
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
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
              {(['ALL', 'CANCELLED', 'NO_SHOW'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFilter === f
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f === 'ALL' ? `All (${data.total_count})` : f === 'CANCELLED' ? `Cancelled (${data.cancelled_count})` : `No Show (${data.no_show_count})`}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Practitioner</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResults.map((item: CancellationItem) => (
                      <tr key={item.appointment_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{formatDate(item.date)}</p>
                          <p className="text-xs text-gray-400">{formatTime(item.start_time)}</p>
                          {item.cancelled_at && (
                            <p className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                              <XCircle className="w-3 h-3" />
                              {new Date(item.cancelled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {item.patient_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{item.patient_name}</p>
                              <p className="text-xs text-gray-400">#{item.patient_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Stethoscope className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm">{item.practitioner_name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{item.service_name || '—'}</p>
                          {item.branch_name && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{item.branch_name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                          {item.cancelled_by && (
                            <p className="text-xs text-gray-400 mt-0.5">by {item.cancelled_by}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.reason ? (
                            <p className="text-xs text-gray-600 max-w-[160px] truncate" title={item.reason}>
                              {item.reason}
                            </p>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <Info className="w-3 h-3" />No reason
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Showing <strong>{filteredResults.length}</strong> of <strong>{data.total_count}</strong> records
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};