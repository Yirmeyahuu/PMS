import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Play, Eye, RefreshCw, CheckCircle,
  AlertCircle, ChevronDown, ChevronUp,
  Calendar, Percent, SkipForward,
} from 'lucide-react';
import { format } from 'date-fns';

import { bulkInvoicingApi } from '@/features/manage/services/billing.api';
import type {
  BulkInvoiceRequest, BulkPreviewItem, InvoiceBatch, AppointmentStatus,
} from '@/types/billing';

// ── helpers ───────────────────────────────────────────────────────────────────
const today        = () => format(new Date(), 'yyyy-MM-dd');
const firstOfMonth = () =>
  format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

const ALLOWED_STATUSES: AppointmentStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED',
];

const BATCH_STATUS_STYLES: Record<string, string> = {
  PENDING:    'bg-gray-100 text-gray-600 border-gray-200',
  PROCESSING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED:  'bg-green-50 text-green-700 border-green-200',
  FAILED:     'bg-red-50 text-red-700 border-red-200',
};

// ── sub-components ────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
    {children}
  </label>
);

const PreviewTable: React.FC<{ items: BulkPreviewItem[] }> = ({ items }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          {['Date', 'Time', 'Patient', 'Practitioner', 'Branch', 'Type', 'Est. Price'].map(h => (
            <th
              key={h}
              className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {items.map(item => (
          <tr key={item.appointment_id} className="hover:bg-gray-50">
            <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{item.date}</td>
            <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.start_time}</td>
            <td className="px-3 py-2.5">
              <p className="font-medium text-gray-800">{item.patient_name}</p>
              <p className="text-xs text-gray-400">{item.patient_number}</p>
            </td>
            <td className="px-3 py-2.5 text-gray-600">{item.practitioner}</td>
            <td className="px-3 py-2.5 text-gray-600">{item.clinic_name}</td>
            <td className="px-3 py-2.5 text-gray-600">{item.appointment_type}</td>
            <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
              ₱{item.estimated_unit_price.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BatchRow: React.FC<{
  batch:    InvoiceBatch;
  expanded: boolean;
  onToggle: () => void;
}> = ({ batch, expanded, onToggle }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-sm font-semibold text-gray-800">{batch.batch_number}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${BATCH_STATUS_STYLES[batch.status] ?? ''}`}>
          {batch.status_display}
        </span>
        <span className="text-xs text-gray-400">{batch.date_from} → {batch.date_to}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>{batch.total_created} invoices</span>
        <span className="font-semibold text-gray-800">
          ₱{parseFloat(batch.total_invoiced_amount).toLocaleString()}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
    </button>

    {expanded && (
      <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50 space-y-3 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          {[
            { label: 'Appointments', value: batch.total_appointments, color: 'text-gray-800' },
            { label: 'Created',      value: batch.total_created,      color: 'text-green-600' },
            { label: 'Skipped',      value: batch.total_skipped,      color: 'text-gray-800' },
            { label: 'Failed',       value: batch.total_failed,       color: 'text-red-600'   },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {batch.error_log.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">
              Errors ({batch.error_log.length})
            </p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {batch.error_log.map((e, i) => (
                <li key={i} className="text-xs text-red-600">
                  Appt #{e.appointment_id}: {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-gray-400">
          By {batch.created_by_name ?? 'System'} &nbsp;·&nbsp;
          {format(new Date(batch.created_at), 'MMM d, yyyy h:mm a')}
        </p>
      </div>
    )}
  </div>
);

// ── main component ────────────────────────────────────────────────────────────
export const AdminMenu2: React.FC = () => {
  const qc = useQueryClient();

  // ── form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<BulkInvoiceRequest>({
    date_from:        firstOfMonth(),
    date_to:          today(),
    clinic_ids:       [],
    status_filter:    ['COMPLETED'],
    invoice_date:     today(),
    due_date:         undefined,
    discount_percent: 0,
    tax_percent:      0,
    skip_existing:    true,
    dry_run:          false,
  });

  const [previewData,   setPreviewData]   = useState<{ total: number; items: BulkPreviewItem[] } | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);
  const [activeTab,     setActiveTab]     = useState<'form' | 'history'>('form');

  // ── queries ────────────────────────────────────────────────────────────────
  const {
    data:    batchHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['invoice-batches'],
    queryFn:  () => bulkInvoicingApi.listBatches(),
    enabled:  activeTab === 'history',
  });

  // ── mutations ──────────────────────────────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: (req: BulkInvoiceRequest) => bulkInvoicingApi.preview(req),
    onSuccess:  data => setPreviewData({ total: data.total_appointments, items: data.preview }),
  });

  const runMutation = useMutation({
    mutationFn: (req: BulkInvoiceRequest) => bulkInvoicingApi.run(req),
    onSuccess:  batch => {
      setPreviewData(null);
      qc.invalidateQueries({ queryKey: ['invoice-batches'] });
      setActiveTab('history');
      setExpandedBatch(batch.id);
    },
  });

  // ── helpers ────────────────────────────────────────────────────────────────
  const setField = <K extends keyof BulkInvoiceRequest>(k: K, v: BulkInvoiceRequest[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleStatus = (s: AppointmentStatus) =>
    setField(
      'status_filter',
      form.status_filter?.includes(s)
        ? form.status_filter.filter(x => x !== s)
        : [...(form.status_filter ?? []), s],
    );

  const handlePreview = () => { setPreviewData(null); previewMutation.mutate(form); };
  const handleRun     = () => runMutation.mutate(form);

  const isPreviewing = previewMutation.isPending;
  const isRunning    = runMutation.isPending;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bulk Invoicing</h2>
              <p className="text-sm text-gray-500">
                Generate invoices for multiple appointments in one operation
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['form', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab === 'form' ? 'New Batch' : 'Batch History'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab: New Batch ──────────────────────────────────────────────────── */}
      {activeTab === 'form' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Date Range &amp; Filters
            </h3>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {([
                { label: 'Appointment Date From', field: 'date_from'    },
                { label: 'Appointment Date To',   field: 'date_to'      },
                { label: 'Invoice Date',          field: 'invoice_date' },
                { label: 'Due Date (optional)',   field: 'due_date'     },
              ] as { label: string; field: keyof BulkInvoiceRequest }[]).map(({ label, field }) => (
                <div key={field} className="flex flex-col gap-1">
                  <FieldLabel>{label}</FieldLabel>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={(form[field] as string) ?? ''}
                      onChange={e => setField(field, e.target.value || undefined)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Discount / Tax */}
            <div className="grid grid-cols-2 gap-4">
              {([
                { label: 'Discount %', field: 'discount_percent' },
                { label: 'Tax %',      field: 'tax_percent'      },
              ] as { label: string; field: keyof BulkInvoiceRequest }[]).map(({ label, field }) => (
                <div key={field} className="flex flex-col gap-1">
                  <FieldLabel>{label}</FieldLabel>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={0} max={100} step={0.01}
                      value={form[field] as number}
                      onChange={e => setField(field, parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Status filter chips */}
            <div className="flex flex-col gap-2">
              <FieldLabel>Include Appointment Statuses</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {ALLOWED_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.status_filter?.includes(s)
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle — skip existing */}
            <div className="flex items-center gap-3 pt-1">
              <button
                role="switch"
                aria-checked={form.skip_existing}
                onClick={() => setField('skip_existing', !form.skip_existing)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  form.skip_existing ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.skip_existing ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
              <span className="text-sm text-gray-700 flex items-center gap-1.5">
                <SkipForward className="w-4 h-4 text-gray-400" />
                Skip already-invoiced appointments
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handlePreview}
              disabled={isPreviewing || !form.date_from || !form.date_to}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-green-500 text-green-700 rounded-xl hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {isPreviewing
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Eye className="w-4 h-4" />}
              {isPreviewing ? 'Loading preview…' : 'Preview'}
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning || !form.date_from || !form.date_to}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {isRunning
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4" />}
              {isRunning ? 'Running…' : 'Run Bulk Invoice'}
            </button>
          </div>

          {/* Error banner */}
          {(previewMutation.isError || runMutation.isError) && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {(() => {
                  const err = (previewMutation.error ?? runMutation.error) as any;
                  const detail = err?.response?.data;
                  if (typeof detail === 'string') return detail;
                  if (detail?.detail) return detail.detail;
                  if (typeof detail === 'object') return JSON.stringify(detail);
                  return 'Something went wrong. Please try again.';
                })()}
              </span>
            </div>
          )}

          {/* Success banner */}
          {runMutation.isSuccess && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Batch <strong>{runMutation.data.batch_number}</strong> completed —&nbsp;
                {runMutation.data.total_created} invoices created.
                Switch to <em>Batch History</em> to view details.
              </span>
            </div>
          )}

          {/* Preview results */}
          {previewData && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Preview — {previewData.total} appointment{previewData.total !== 1 ? 's' : ''} would be invoiced
                </h3>
                {previewData.total > 100 && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    Showing first 100
                  </span>
                )}
              </div>
              {previewData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No matching appointments found for the selected criteria.
                </div>
              ) : (
                <PreviewTable items={previewData.items} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Batch History ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {batchHistory?.count ?? 0} batch{batchHistory?.count !== 1 ? 'es' : ''} found
            </p>
            <button
              onClick={() => refetchHistory()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading history…
            </div>
          ) : (batchHistory?.results ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No batches yet. Run your first bulk invoicing above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(batchHistory?.results ?? []).map((batch: InvoiceBatch) => (
                <BatchRow
                  key={batch.id}
                  batch={batch}
                  expanded={expandedBatch === batch.id}
                  onToggle={() =>
                    setExpandedBatch(prev => prev === batch.id ? null : batch.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};