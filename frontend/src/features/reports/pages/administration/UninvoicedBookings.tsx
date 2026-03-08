import React, { useState, useCallback } from 'react';
import { FileX, Clock, User, Stethoscope, Building2, AlertTriangle } from 'lucide-react';
import {
  getUninvoicedBookings,
  type UninvoicedBookingsResponse,
  type UninvoicedBookingItem,
} from '../../reports.api';
import {
  DateRangePicker, StatCard, ReportLoading, ReportError, ReportEmpty,
  ReportHeader, StatusBadge, AppointmentTypeBadge,
  formatDate, formatTime, todayISO, monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';

export const UninvoicedBookings: React.FC = () => {
  const [startDate,  setStartDate]  = useState(monthStart());
  const [endDate,    setEndDate]    = useState(todayISO());
  const [data,       setData]       = useState<UninvoicedBookingsResponse | null>(null);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hasRun,     setHasRun]     = useState(false);

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getUninvoicedBookings({ start_date: startDate, end_date: endDate });
      setData(result);
      setHasRun(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to generate report';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  const getDaysColor = (days: number | null) => {
    if (days === null) return 'text-gray-500';
    if (days <= 3)  return 'text-green-600';
    if (days <= 7)  return 'text-yellow-600';
    if (days <= 14) return 'text-orange-600';
    return 'text-red-600';
  };

  const getDaysBg = (days: number | null) => {
    if (days === null) return 'bg-gray-100 text-gray-500';
    if (days <= 3)  return 'bg-green-50 text-green-700 border border-green-200';
    if (days <= 7)  return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    if (days <= 14) return 'bg-orange-50 text-orange-700 border border-orange-200';
    return 'bg-red-50 text-red-700 border border-red-200';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onApply={run}
          isLoading={isLoading}
        />
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
              <FileX className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Uninvoiced Bookings Report</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Select a date range and click <strong>Run Report</strong> to see completed
              appointments that have not yet been invoiced.
            </p>
          </div>
        ) : !data || data.total_count === 0 ? (
          <ReportEmpty message="No uninvoiced bookings found for the selected date range." />
        ) : (
          <>
            {/* Report Header */}
            <ReportHeader
              title="Uninvoiced Bookings"
              description="Completed appointments that have no invoice attached"
              startDate={data.start_date}
              endDate={data.end_date}
              icon={<FileX className="w-5 h-5" />}
              totalBadge={
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {data.total_count} uninvoiced
                </span>
              }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Total Uninvoiced"
                value={data.total_count}
                color="text-red-700"
                bg="bg-red-50"
                border="border-red-200"
                icon={<FileX className="w-4 h-4" />}
              />
              <StatCard
                label="Overdue (>7 days)"
                value={data.results.filter((r) => (r.days_since_completed ?? 0) > 7).length}
                color="text-orange-700"
                bg="bg-orange-50"
                border="border-orange-200"
                icon={<AlertTriangle className="w-4 h-4" />}
              />
              <StatCard
                label="This Week (≤7 days)"
                value={data.results.filter((r) => (r.days_since_completed ?? 0) <= 7).length}
                color="text-yellow-700"
                bg="bg-yellow-50"
                border="border-yellow-200"
                icon={<Clock className="w-4 h-4" />}
              />
              <StatCard
                label="Practitioners"
                value={new Set(data.results.map((r) => r.practitioner_name)).size}
                color="text-sky-700"
                bg="bg-sky-50"
                border="border-sky-200"
                icon={<Stethoscope className="w-4 h-4" />}
              />
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Days Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.results.map((item: UninvoicedBookingItem) => (
                      <tr key={item.appointment_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{formatDate(item.date)}</p>
                          <p className="text-xs text-gray-400">{formatTime(item.start_time)} – {formatTime(item.end_time)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
                          <AppointmentTypeBadge type={item.appointment_type} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDaysBg(item.days_since_completed)}`}>
                            {item.days_since_completed !== null ? `${item.days_since_completed}d` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Showing <strong>{data.total_count}</strong> uninvoiced bookings · Date range: {formatDate(data.start_date)} – {formatDate(data.end_date)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};