import React, { useState, useCallback } from 'react';
import { FileText, FileMinus, FileWarning, Stethoscope, Building2, Clock, AlertTriangle } from 'lucide-react';
import {
  getClinicalNotes,
  type ClinicalNotesResponse,
  type ClinicalNotesMissingItem,
} from '../../reports.api';
import {
  DateRangePicker, StatCard, ReportLoading, ReportError, ReportEmpty,
  ReportHeader, AppointmentTypeBadge,
  formatDate, formatTime, todayISO, monthStart,
} from '../../components/ReportShared';
import toast from 'react-hot-toast';

const NOTE_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  MISSING:       { label: 'No Note',      color: 'bg-red-50 text-red-700 border border-red-200',         icon: <FileMinus className="w-3 h-3" /> },
  UNSIGNED_DRAFT: { label: 'Unsigned Draft', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: <FileWarning className="w-3 h-3" /> },
};

const getDaysSeverity = (days: number) => {
  if (days <= 3)  return 'bg-green-50 text-green-700 border border-green-200';
  if (days <= 7)  return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  if (days <= 14) return 'bg-orange-50 text-orange-700 border border-orange-200';
  return 'bg-red-50 text-red-700 border border-red-200';
};

export const ClinicalNotes: React.FC = () => {
  const [startDate,        setStartDate]        = useState(monthStart());
  const [endDate,          setEndDate]          = useState(todayISO());
  const [includeUnsigned,  setIncludeUnsigned]  = useState(false);
  const [data,             setData]             = useState<ClinicalNotesResponse | null>(null);
  const [isLoading,        setIsLoading]        = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [hasRun,           setHasRun]           = useState(false);
  const [activeFilter,     setActiveFilter]     = useState<'ALL' | 'MISSING' | 'UNSIGNED_DRAFT'>('ALL');

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getClinicalNotes({
        start_date:       startDate,
        end_date:         endDate,
        include_unsigned: includeUnsigned,
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
  }, [startDate, endDate, includeUnsigned]);

  const filteredResults = (data?.results ?? []).filter((item) => {
    if (activeFilter === 'ALL')            return true;
    if (activeFilter === 'MISSING')        return item.note_status === 'MISSING';
    if (activeFilter === 'UNSIGNED_DRAFT') return item.note_status === 'UNSIGNED_DRAFT';
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

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['ALL', 'MISSING', 'UNSIGNED_DRAFT'] as const).map((f) => (
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
                    ? `All (${data.total_count})`
                    : f === 'MISSING'
                    ? `No Note (${data.missing_note_count})`
                    : `Unsigned Drafts (${data.unsigned_note_count})`}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Note Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Days Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResults.map((item: ClinicalNotesMissingItem) => {
                      const noteConfig = NOTE_STATUS_CONFIG[item.note_status];
                      return (
                        <tr key={item.appointment_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{formatDate(item.date)}</p>
                            <p className="text-xs text-gray-400">{formatTime(item.start_time)} – {formatTime(item.end_time)}</p>
                          </td>
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
                          <td className="px-4 py-3">
                            {noteConfig && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${noteConfig.color}`}>
                                {noteConfig.icon}
                                {noteConfig.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDaysSeverity(item.days_since)}`}>
                              {item.days_since}d
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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