import React, { useState, useCallback } from 'react';
import { Users, UserPlus, Calendar, Phone, Mail, Stethoscope, ChevronDown, Star } from 'lucide-react';
import {
  getClientsCases,
  type ClientCasesResponse,
  type ClientCaseItem,
  type UpcomingBooking,
} from '../../reports.api';
import {
  DateRangePicker, StatCard, ReportLoading, ReportError, ReportEmpty,
  ReportHeader, StatusBadge, AppointmentTypeBadge,
  formatDate, formatTime, todayISO, monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';

const GENDER_LABELS: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other' };

export const ClientCases: React.FC = () => {
  const [startDate,   setStartDate]   = useState(monthStart());
  const [endDate,     setEndDate]     = useState(todayISO());
  const [newOnly,     setNewOnly]     = useState(false);
  const [data,        setData]        = useState<ClientCasesResponse | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasRun,      setHasRun]      = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEW'>('ALL');

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getClientsCases({
        start_date: startDate,
        end_date:   endDate,
        new_only:   newOnly,
      });
      setData(result);
      setHasRun(true);
      setExpandedIds(new Set());
      setActiveFilter('ALL');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to generate report';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, newOnly]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredResults = (data?.results ?? []).filter((item) => {
    if (activeFilter === 'NEW') return item.is_new_this_period;
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
            checked={newOnly}
            onChange={(e) => setNewOnly(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
          />
          <span className="text-sm text-gray-600 font-medium">Show new clients only</span>
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
              <Users className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Clients & Cases Report</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Select a date range and click <strong>Run Report</strong> to see new client
              registrations and case bookings with upcoming appointments.
            </p>
          </div>
        ) : !data || data.total_patients === 0 ? (
          <ReportEmpty message="No client records found for the selected date range." />
        ) : (
          <>
            <ReportHeader
              title="Clients & Cases"
              description="New client registrations and case bookings with upcoming appointments"
              startDate={data.start_date}
              endDate={data.end_date}
              icon={<Users className="w-5 h-5" />}
              totalBadge={
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-full">
                  <Users className="w-3.5 h-3.5" />
                  {data.total_patients} clients
                </span>
              }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <StatCard
                label="Total Clients"
                value={data.total_patients}
                color="text-gray-900"
                icon={<Users className="w-4 h-4" />}
              />
              <StatCard
                label="New This Period"
                value={data.new_clients_count}
                color="text-green-700"
                bg="bg-green-50"
                border="border-green-200"
                icon={<UserPlus className="w-4 h-4" />}
              />
              <StatCard
                label="Total Bookings"
                value={data.total_range_bookings}
                color="text-sky-700"
                bg="bg-sky-50"
                border="border-sky-200"
                icon={<Calendar className="w-4 h-4" />}
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {(['ALL', 'NEW'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFilter === f
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f === 'ALL'
                    ? `All Clients (${data.total_patients})`
                    : `New This Period (${data.new_clients_count})`}
                </button>
              ))}
            </div>

            {/* Client Cards */}
            <div className="space-y-3">
              {filteredResults.map((item: ClientCaseItem) => {
                const isExpanded = expandedIds.has(item.patient_id);
                return (
                  <div
                    key={item.patient_id}
                    className={`bg-white border rounded-xl overflow-hidden transition-all ${
                      item.is_new_this_period ? 'border-green-200' : 'border-gray-200'
                    }`}
                  >
                    {/* Client Row */}
                    <div className="flex items-center gap-4 px-4 py-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                        item.is_new_this_period
                          ? 'bg-gradient-to-br from-green-400 to-green-600'
                          : 'bg-gradient-to-br from-sky-400 to-sky-600'
                      }`}>
                        {item.patient_name.charAt(0)}
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{item.patient_name}</p>
                          <span className="text-xs text-gray-400 font-mono">#{item.patient_number}</span>
                          {item.is_new_this_period && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                              <Star className="w-3 h-3" />
                              New Client
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="text-xs text-gray-500">{GENDER_LABELS[item.gender] ?? item.gender}</span>
                          {item.date_of_birth && (
                            <span className="text-xs text-gray-500">DOB: {formatDate(item.date_of_birth)}</span>
                          )}
                          {item.phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{item.phone}
                            </span>
                          )}
                          {item.email && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{item.email}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats & Expand */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500">Period bookings</p>
                          <p className="text-sm font-bold text-gray-900">{item.range_bookings}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500">Upcoming</p>
                          <p className={`text-sm font-bold ${item.upcoming_bookings.length > 0 ? 'text-sky-700' : 'text-gray-400'}`}>
                            {item.upcoming_bookings.length}
                          </p>
                        </div>
                        {item.upcoming_bookings.length > 0 && (
                          <button
                            onClick={() => toggleExpand(item.patient_id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Upcoming Bookings Expanded */}
                    {isExpanded && item.upcoming_bookings.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Upcoming Bookings ({item.upcoming_bookings.length})
                        </p>
                        <div className="space-y-2">
                          {item.upcoming_bookings.map((booking: UpcomingBooking) => (
                            <div key={booking.appointment_id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <div className="flex-shrink-0 text-center w-10">
                                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                                  {new Date(booking.date + 'T00:00').toLocaleDateString('en-US', { month: 'short' })}
                                </p>
                                <p className="text-base font-bold text-gray-900 leading-tight">
                                  {new Date(booking.date + 'T00:00').getDate()}
                                </p>
                              </div>
                              <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <AppointmentTypeBadge type={booking.appointment_type} />
                                  <StatusBadge status={booking.status} />
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatTime(booking.start_time)}
                                  {booking.practitioner_name && <> · <Stethoscope className="w-3 h-3 inline mx-0.5" />{booking.practitioner_name}</>}
                                  {booking.service_name && <> · {booking.service_name}</>}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 text-xs text-gray-400 text-center">
              Showing {filteredResults.length} of {data.total_patients} clients
            </div>
          </>
        )}
      </div>
    </div>
  );
};