import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer, Search, Filter, RefreshCw, Download,
  Calendar, User, Building2, Clock,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';

import { printAppointmentsApi } from '../../services/billing.api';
import type { AppointmentPrintFilters, AppointmentPrintRecord, AppointmentStatus } from '@/types/billing';
import MalasakitLogo from '@/assets/malasakit/PrimaryLogo-Colored.png';

// ── helpers ───────────────────────────────────────────────────────────────────
const today = () => format(new Date(), 'yyyy-MM-dd');

const formatTime12h = (timeStr?: string) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
};

const statusOpts: AppointmentStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
];

const STAT_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:   'bg-green-50 text-green-700 border-green-200',
  CHECKED_IN:  'bg-purple-50 text-purple-700 border-purple-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED:   'bg-gray-50 text-gray-700 border-gray-200',
  CANCELLED:   'bg-red-50 text-red-700 border-red-200',
  NO_SHOW:     'bg-orange-50 text-orange-700 border-orange-200',
};

// ── component ─────────────────────────────────────────────────────────────────
export const AdminMenu1: React.FC = () => {
  // ── filters state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<AppointmentPrintFilters>({
    date_from: today(),
    date_to:   today(),
  });
  const [search,           setSearch]           = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>([]);
  const [ordering,         setOrdering]         = useState('date');
  const [showFilters,      setShowFilters]      = useState(false);

  // Build active query params
  const activeFilters: AppointmentPrintFilters = {
    ...filters,
    ...(search                  ? { patient_name: search }          : {}),
    ...(selectedStatuses.length ? { status: selectedStatuses }      : {}),
    ordering,
  };

  // ── queries ────────────────────────────────────────────────────────────────
  const {
    data:      listData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['appointments-print-list', activeFilters],
    queryFn:  () => printAppointmentsApi.list(activeFilters),
    enabled:  !!(filters.date_from && filters.date_to),
  });

  const appointments = listData?.results ?? [];

  // ── sort toggle ────────────────────────────────────────────────────────────
  const toggleSort = useCallback((field: string) => {
    setOrdering(prev =>
      prev === field ? `-${field}` : prev === `-${field}` ? field : field,
    );
  }, []);

  const SortIcon = ({ field }: { field: string }) =>
    ordering === field
      ? <ChevronUp   className="w-3 h-3 inline ml-1" />
      : ordering === `-${field}`
        ? <ChevronDown className="w-3 h-3 inline ml-1" />
        : <ChevronUp   className="w-3 h-3 inline ml-1 opacity-20" />;

  // ── print handler ──────────────────────────────────────────────────────────
  const handlePrint = useCallback(async () => {
    const payload = await printAppointmentsApi.payload(activeFilters);
    const win = window.open('', '_blank');
    if (!win) return;

    const rows = payload.appointments.map((a: AppointmentPrintRecord) => `
      <tr>
        <td style="font-family: monospace; font-size: 11px;">${a.patient_number || (a.patient_id ? String(a.patient_id) : '—')}</td>
        <td><strong>${a.patient_name || '—'}</strong></td>
        <td>${a.clinic_name || '—'}</td>
        <td>${a.appointment_type_display || a.appointment_type || '—'}</td>
        <td>${a.practitioner_name || '—'}</td>
        <td>${a.date || '—'}</td>
        <td>${a.start_time && a.end_time ? `${formatTime12h(a.start_time)} – ${formatTime12h(a.end_time)}` : (formatTime12h(a.start_time) || '—')}</td>
        <td>${a.status_display || a.status || '—'}</td>
      </tr>`).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Appointments — ${filters.date_from} to ${filters.date_to}</title>
        <style>
          body  { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #111; }
          h1    { font-size: 16px; margin-bottom: 4px; }
          p     { margin: 2px 0 8px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th    { background: #f3f4f6; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; }
          tr:nth-child(even) { background: #fafafa; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>Appointment Report</h1>
        <p>${filters.date_from} → ${filters.date_to}</p>
        <button onclick="window.print()">🖨 Print</button>
        <table>
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Patient Full Name</th>
              <th>Branch</th>
              <th>Appointment Type</th>
              <th>Practitioner</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>Generated by Malasakit</span>
          <img src="${MalasakitLogo}" alt="Malasakit Logo" style="height: 24px; width: auto;" />
        </div>
      </body>
      </html>`);
    win.document.close();
  }, [activeFilters, filters]);

  // ── status toggle ──────────────────────────────────────────────────────────
  const toggleStatus = (s: AppointmentStatus) =>
    setSelectedStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s],
    );

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Print Appointments</h2>
              <p className="text-sm text-gray-500">
                Filter and print appointment lists by date, branch, or practitioner
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={appointments.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              Print / Export
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {/* Row 1 — dates + search */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.date_from ?? ''}
                onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.date_to ?? ''}
                onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 min-w-[200px] flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Search Patient</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Patient name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {selectedStatuses.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {selectedStatuses.length}
              </span>
            )}
          </button>
        </div>

        {/* Row 2 — status chips */}
        {showFilters && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">Filter by Status</p>
            <div className="flex flex-wrap gap-2">
              {statusOpts.map(s => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedStatuses.includes(s)
                      ? (STAT_COLORS[s] ?? 'bg-gray-100 text-gray-700 border-gray-200')
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
              {selectedStatuses.length > 0 && (
                <button
                  onClick={() => setSelectedStatuses([])}
                  className="px-3 py-1 rounded-full text-xs text-red-600 border border-red-200 hover:bg-red-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading appointments…
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Calendar className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No appointments found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    { label: 'Patient ID',        field: '' },
                    { label: 'Patient Full Name', field: 'patient__last_name' },
                    { label: 'Branch',            field: 'clinic__name' },
                    { label: 'Appointment Type',  field: 'appointment_type' },
                    { label: 'Practitioner',      field: 'practitioner__user__last_name' },
                    { label: 'Date',              field: 'date' },
                    { label: 'Time',              field: 'start_time' },
                    { label: 'Status',            field: 'status' },
                  ].map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.field && toggleSort(col.field)}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap ${
                        col.field ? 'cursor-pointer hover:text-gray-900 select-none' : ''
                      }`}
                    >
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt: AppointmentPrintRecord) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    {/* 1. Patient ID */}
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {appt.patient_number || (appt.patient_id ? String(appt.patient_id) : '—')}
                    </td>
                    {/* 2. Patient Full Name */}
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {appt.patient_name || '—'}
                    </td>
                    {/* 3. Branch */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{appt.clinic_name || '—'}</span>
                      </div>
                    </td>
                    {/* 4. Appointment Type */}
                    <td className="px-4 py-3 text-gray-600">
                      {appt.appointment_type_display || appt.appointment_type || '—'}
                    </td>
                    {/* 5. Practitioner */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{appt.practitioner_name || '—'}</span>
                      </div>
                    </td>
                    {/* 6. Date */}
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {appt.date || '—'}
                    </td>
                    {/* 7. Time */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <Clock className="w-3 h-3 inline mr-1 opacity-50" />
                      {appt.start_time && appt.end_time ? `${formatTime12h(appt.start_time)} – ${formatTime12h(appt.end_time)}` : (formatTime12h(appt.start_time) || '—')}
                    </td>
                    {/* 8. Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STAT_COLORS[appt.status] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {appt.status_display || appt.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {appointments.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
            <span>
              Showing {appointments.length} of {listData?.count ?? appointments.length} appointments
            </span>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Print / Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PrintAppointments = AdminMenu1;
export default AdminMenu1;