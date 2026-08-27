import React, { useState, useCallback } from 'react';
import { FileText, FileMinus, FileWarning, Stethoscope, Building2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getClinicalNotes,
  type ClinicalNotesResponse,
  type ClinicalNotesMissingItem,
} from '../../reports.api';
import {
  DateRangePicker, StatCard, ReportLoading, ReportError, ReportEmpty,
  ReportHeader,
  formatDate, formatTime, todayISO, monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';

export const ClinicalNotes: React.FC = () => {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(todayISO());
  const [includeUnsigned, setIncludeUnsigned] = useState(false);
  const [data, setData] = useState<ClinicalNotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MISSING' | 'CREATED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getClinicalNotes({
        start_date: startDate,
        end_date: endDate,
        include_unsigned: includeUnsigned,
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
  }, [startDate, endDate, includeUnsigned]);

  const filteredResults = (data?.results ?? []).filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'MISSING') return item.note_status === 'MISSING';
    if (activeFilter === 'CREATED') return item.note_status === 'UNSIGNED_DRAFT' || item.note_status === 'SIGNED';
    return true;
  });

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredResults.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginationUI = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredResults.length > 0 ? startIndex + 1 : 0}</span> to{' '}
          <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredResults.length)}</span> of{' '}
          <span className="font-medium">{filteredResults.length}</span> results
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 space-y-3">
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
            checked={includeUnsigned}
            onChange={(e) => setIncludeUnsigned(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
          />
          <span className="text-sm text-gray-600 font-medium">Include unsigned (draft) notes</span>
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
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Clinical Notes Report</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Select a date range and click <strong>Run Report</strong> to identify completed
              appointments with no finalised clinical notes.
            </p>
          </div>
        ) : !data || data.total_count === 0 ? (
          <ReportEmpty message="All completed appointments have finalised clinical notes. Nice work!" />
        ) : (
          <>
            <ReportHeader
              title="Clinical Notes"
              description="Completed appointments without a finalised clinical note"
              startDate={data.start_date}
              endDate={data.end_date}
              icon={<FileText className="w-5 h-5" />}
              totalBadge={
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {data.total_count} missing
                </span>
              }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <StatCard
                label="Total Missing"
                value={data.total_count}
                color="text-red-700"
                bg="bg-red-50"
                border="border-red-200"
                icon={<FileMinus className="w-4 h-4" />}
              />
              <StatCard
                label="No Note At All"
                value={data.missing_note_count}
                color="text-red-700"
                bg="bg-red-50"
                border="border-red-200"
                icon={<FileMinus className="w-4 h-4" />}
              />
              <StatCard
                label="Unsigned Drafts"
                value={data.unsigned_note_count}
                color="text-yellow-700"
                bg="bg-yellow-50"
                border="border-yellow-200"
                icon={<FileWarning className="w-4 h-4" />}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex gap-2 mb-4 items-center">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Note Status Filter:</label>
              <select
                id="status-filter"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm py-2 pl-3 pr-10 border"
              >
                <option value="ALL">All Statuses</option>
                <option value="MISSING">No Notes Yet</option>
                <option value="CREATED">Note Created</option>
              </select>
            </div>

            {/* Table */}
            <div className="flex justify-end mb-4">
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
                {paginationUI}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Appointment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Time of Appointment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Clinic Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Practitioner Assigned</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Consultation / Appointment / Services Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Note Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Case</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentItems.map((item: ClinicalNotesMissingItem) => {
                      const statusLabel = item.note_status === 'MISSING' ? 'No Notes Yet' : 'Note Created';
                      const statusColor = item.note_status === 'MISSING'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-green-50 text-green-700 border-green-200';

                      return (
                        <tr key={item.appointment_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {item.patient_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{item.patient_name}</p>
                                <p className="text-xs text-gray-400">#{item.patient_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-medium text-gray-900">{formatDate(item.date)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{formatTime(item.start_time)} – {formatTime(item.end_time)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {item.branch_name ? (
                              <div className="flex items-center gap-1 text-gray-600 text-sm">
                                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="line-clamp-2">{item.branch_name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.practitioner_name ? (
                              <div className="flex items-center gap-1.5 text-gray-700 text-sm">
                                <Stethoscope className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="whitespace-nowrap">{item.practitioner_name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-700">{item.service_name || item.appointment_type || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.case_title ? (
                              <span className="text-sm text-gray-700">{item.case_title}</span>
                            ) : (
                              <span className="text-gray-400 text-sm italic">No case assigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between pb-6">
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