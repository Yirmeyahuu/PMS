import React, { useState, useCallback } from 'react';
import { Users, Stethoscope, Building2, ChevronLeft, ChevronRight, Star, FileText, UserPlus } from 'lucide-react';
import {
  getClientsCases,
  type ClientCasesResponse,
  type ClientCaseItem,
} from '../../reports.api';
import {
  DateRangePicker, StatCard, ReportLoading, ReportError, ReportEmpty,
  ReportHeader,
  formatDate, todayISO, monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';
import { PatientAvatar } from '@/features/patients/components/PatientAvatar';

export const ClientCases: React.FC = () => {
  const [startDate,   setStartDate]   = useState(monthStart());
  const [endDate,     setEndDate]     = useState(todayISO());
  const [newOnly,     setNewOnly]     = useState(false);
  const [data,        setData]        = useState<ClientCasesResponse | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasRun,      setHasRun]      = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEW'>('ALL');
  const [currentPage,  setCurrentPage]  = useState(1);
  const itemsPerPage = 15;

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
      setActiveFilter('ALL');
      setCurrentPage(1);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to generate report';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, newOnly]);

  const filteredResults = (data?.results ?? []).filter((item) => {
    if (activeFilter === 'NEW') return item.is_new_this_period;
    return true;
  });

  const totalItems = filteredResults.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  
  const indexOfLastItem = validCurrentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);

  const paginationUI = (
    <div className="flex flex-col sm:flex-row items-center justify-between w-full">
      <p className="text-xs text-gray-500">
        Showing <strong>{totalItems === 0 ? 0 : indexOfFirstItem + 1}</strong> to{' '}
        <strong>{Math.min(indexOfLastItem, totalItems)}</strong> of{' '}
        <strong>{totalItems}</strong> records
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={validCurrentPage === 1}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 font-medium px-2">
            Page {validCurrentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={validCurrentPage === totalPages}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

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
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard
                label="Total Clients"
                value={data.total_patients}
                color="text-gray-900"
                bg="bg-gray-50"
                border="border-gray-200"
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
            </div>

            {/* Filter */}
            {/* Filter Tabs & Top Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex gap-2">
                {(['ALL', 'NEW'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setActiveFilter(f);
                      setCurrentPage(1);
                    }}
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
              <div className="w-full sm:w-auto">
                {paginationUI}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Clinic Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Practitioner Assigned</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Cases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentItems.map((item: ClientCaseItem) => (
                      <tr key={item.patient_id} className="hover:bg-gray-50 transition-colors">
                        
                        {/* Patient */}
                        <td className="px-4 py-3 align-top min-w-[200px]">
                          <div className="flex items-start gap-3">
                            <PatientAvatar name={item.patient_name} className="w-8 h-8 mt-0.5" />
                            <div>
                              <p className="font-medium text-gray-900 text-sm leading-tight">{item.patient_name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">#{item.patient_number}</p>
                              {item.is_new_this_period && (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-medium rounded border border-green-200">
                                  <Star className="w-2.5 h-2.5" /> New
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Date Created */}
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {item.date_created ? (
                            <span className="font-medium text-gray-900">{formatDate(item.date_created)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Branch */}
                        <td className="px-4 py-3 align-top">
                          {item.branches && item.branches.length > 0 ? (
                            <div className="flex flex-col gap-1 text-gray-600 text-sm">
                              {item.branches.map((b, i) => (
                                <div key={i} className="flex items-start gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{b}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Practitioner */}
                        <td className="px-4 py-3 align-top">
                          {item.practitioners && item.practitioners.length > 0 ? (
                            <div className="flex flex-col gap-1.5 text-gray-700 text-sm">
                              {item.practitioners.map((p, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <Stethoscope className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="whitespace-nowrap">{p}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Cases */}
                        <td className="px-4 py-3 align-top min-w-[200px]">
                          {item.cases && item.cases.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {item.cases.map((c, i) => (
                                <div key={i} className="inline-flex items-start gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 w-fit max-w-full">
                                  <FileText className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <span className="truncate">{c.title}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No cases assigned</span>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                {paginationUI}
              </div>
            </div>
            {/* Added padding to prevent bottom pagination from being cut off */}
            <div className="h-12 w-full" />
          </>
        )}
      </div>
    </div>
  );
};