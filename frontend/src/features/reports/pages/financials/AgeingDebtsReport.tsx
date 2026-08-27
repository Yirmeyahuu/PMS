import React, { useState, useCallback, useEffect } from 'react';
import { Clock, AlertTriangle, DollarSign, Plus, Search, X } from 'lucide-react';
import {
  ReportHeader,
  StatCard,
  ReportLoading,
  ReportError,
  ReportEmpty,
  PrintButton,
  openPrintWindow,
  formatDate,
} from '../../components/ReportShared';
import {
  getAgeingDebts,
  type AgeingDebtsResponse,
  type AgeingDebtItem,
} from '../../reports.api';
import { AddAgeingDebtModal } from './components/AddAgeingDebtModal';
import { EditAgeingDebtModal } from './components/EditAgeingDebtModal';

const formatPeso = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });







function buildPrintHtml(data: AgeingDebtsResponse): string {
  const { summary, debts, generated_at } = data;
  const bt = summary.bucket_totals;

  const rowsHtml = debts.map((d) => `
    <tr>
      <td>
        <div class="patient-name">${d.patient_name}</div>
        <div class="patient-num">#${d.patient_number}</div>
      </td>
      <td>
        <div class="time-primary">${d.source === 'unbilled_appointment' ? 'UNBILLED' : (d.invoice_number || '—')}</div>
        <div class="time-secondary">${d.invoice_date ? formatDate(d.invoice_date) : '—'}</div>
      </td>
      <td>${d.appointment_date ? formatDate(d.appointment_date) : '—'}</td>
      <td>${d.appointment_type || '—'}</td>
      <td>${d.practitioner_name || '—'}</td>
      <td>${d.due_date ? formatDate(d.due_date) : '—'}</td>
      <td style="text-align:right; font-weight:bold">${formatPeso(d.balance_due)}</td>
      <td>${d.days_overdue} days</td>
    </tr>
  `).join('');

  return `
    <div class="header">
      <div class="header-left">
        <h1>Ageing Debts Report</h1>
        <p class="meta">As at: ${new Date(generated_at).toLocaleDateString()}</p>
        <p class="meta">Generated: ${new Date(generated_at).toLocaleString()}</p>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-value">${formatPeso(summary.total_outstanding)}</div><div class="stat-label">Total Outstanding</div></div>
      <div class="stat"><div class="stat-value">${formatPeso(bt['0_30'] ?? 0)}</div><div class="stat-label">0–30 Days</div></div>
      <div class="stat"><div class="stat-value">${formatPeso(bt['31_60'] ?? 0)}</div><div class="stat-label">31–60 Days</div></div>
      <div class="stat"><div class="stat-value">${formatPeso(bt['61_90'] ?? 0)}</div><div class="stat-label">61–90 Days</div></div>
      <div class="stat"><div class="stat-value">${formatPeso(bt['90_plus'] ?? 0)}</div><div class="stat-label">90+ Days</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Client</th>
          <th style="text-align:left">Reference</th>
          <th style="text-align:left">Appt Date</th>
          <th style="text-align:left">Appt Type</th>
          <th style="text-align:left">Practitioner</th>
          <th style="text-align:left">Due Date</th>
          <th style="text-align:right">Outstanding</th>
          <th style="text-align:left">Age</th>
        </tr>
      </thead>
      <tbody>
        ${debts.length > 0 ? rowsHtml : '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:16px">No overdue invoices found</td></tr>'}
      </tbody>
      <tfoot>
        <tr style="font-weight:700; background:#fef2f2">
          <td colspan="6" style="text-align:left">Totals</td>
          <td style="text-align:right; color:#dc2626">${formatPeso(summary.total_outstanding)}</td>
          <td colspan="1"></td>
        </tr>
      </tfoot>
    </table>
    <div class="footer">
      <span>Ageing Debts Report</span>
      <span>${new Date(generated_at).toLocaleString()}</span>
    </div>
  `;
}

export const AgeingDebtsReport: React.FC = () => {
  const [data,           setData]           = useState<AgeingDebtsResponse | null>(null);
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [hasRun,         setHasRun]         = useState(false);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [editEntry,      setEditEntry]       = useState<any | null>(null);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [filterBucket,    setFilterBucket]    = useState('ALL');
  const [startDate,       setStartDate]       = useState('');
  const [endDate,         setEndDate]         = useState('');
  const [currentPage,     setCurrentPage]     = useState(1);
  const itemsPerPage = 15;

  const runReport = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAgeingDebts({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load report.');
    } finally {
      setIsLoading(false);
      setHasRun(true);
    }
  }, [startDate, endDate]);

  const handlePrint = () => {
    if (!data) return;
    openPrintWindow(buildPrintHtml(data), 'Ageing Debts Report');
  };

  const handleEntryCreated = (_entry: any) => {
    runReport();
  };

  const handleEntryUpdated = (_entry: any) => {
    runReport();
  };

  const handleEntryDeleted = (_id: number) => {
    setEditEntry(null);
    runReport();
  };

  const handlePaymentRecorded = (_entry: any) => {
    setEditEntry(null);
    runReport();
  };

  const debts: AgeingDebtItem[] = data?.debts ?? [];
  const bt = data?.summary.bucket_totals;

  const filteredDebts = debts.filter(d => {
    if (filterBucket !== 'ALL' && d.bucket !== filterBucket) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !d.patient_name?.toLowerCase().includes(q) &&
        !d.invoice_number?.toLowerCase().includes(q) &&
        !d.patient_number?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBucket]);

  const totalPages = Math.ceil(filteredDebts.length / itemsPerPage) || 1;
  const currentItems = filteredDebts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const paginationUI = (
    <div className="flex items-center justify-between text-sm w-full">
      <div className="text-gray-500">
        Showing <span className="font-medium text-gray-900">{filteredDebts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredDebts.length)}</span> of <span className="font-medium text-gray-900">{filteredDebts.length}</span> entries
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <div className="flex items-center px-3 py-1 font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-md">
          {currentPage} / {totalPages}
        </div>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );


  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">

      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-5">
        <div>
          <p className="text-sm font-semibold text-gray-700">Accounts Receivable Management</p>
          <p className="text-xs text-gray-500 mt-0.5">Manage outstanding debts and track payments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runReport}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {isLoading ? 'Loading…' : 'Run Report'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Ageing Debt
          </button>
        </div>
      </div>

      {isLoading && <ReportLoading />}
      {!isLoading && error && <ReportError message={error} onRetry={runReport} />}

      {!isLoading && !error && data && (
        <div className="space-y-5">
          <ReportHeader
            title="Ageing Debts Report"
            description="Unpaid and partially-paid invoices by age bucket"
            startDate=""
            endDate=""
            icon={<Clock className="w-5 h-5 text-white" />}
            totalBadge={`${data.summary.total_invoices} entries`}
            actions={<PrintButton onClick={handlePrint} isLoading={isLoading} />}
          />

          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search client, invoice #…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
            </div>
            <select
              value={filterBucket}
              onChange={e => setFilterBucket(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            >
              <option value="ALL">All Buckets</option>
              <option value="CURRENT">Current</option>
              <option value="0_30">1-30 Days</option>
              <option value="31_60">31-60 Days</option>
              <option value="61_90">61-90 Days</option>
              <option value="90_plus">90+ Days</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              label="Total Outstanding"
              value={formatPeso(data.summary.total_outstanding)}
              color="text-red-700"
              bg="bg-red-50"
              border="border-red-200"
              icon={<DollarSign className="w-5 h-5 text-red-600" />}
            />
            <StatCard
              label="Current"
              value={formatPeso(bt?.['CURRENT'] ?? 0)}
              color="text-blue-700"
              bg="bg-blue-50"
              border="border-blue-200"
              icon={<Clock className="w-5 h-5 text-blue-600" />}
            />
            <StatCard
              label="1-30 Days"
              value={formatPeso(bt?.['0_30'] ?? 0)}
              color="text-yellow-700"
              bg="bg-yellow-50"
              border="border-yellow-200"
              icon={<Clock className="w-5 h-5 text-yellow-600" />}
            />
            <StatCard
              label="31-60 Days"
              value={formatPeso(bt?.['31_60'] ?? 0)}
              color="text-orange-700"
              bg="bg-orange-50"
              border="border-orange-200"
              icon={<Clock className="w-5 h-5 text-orange-600" />}
            />
            <StatCard
              label="61-90 Days"
              value={formatPeso(bt?.['61_90'] ?? 0)}
              color="text-red-700"
              bg="bg-red-50"
              border="border-red-200"
              icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCard
              label="90+ Days"
              value={formatPeso(bt?.['90_plus'] ?? 0)}
              color="text-rose-800"
              bg="bg-rose-100"
              border="border-rose-300"
              icon={<AlertTriangle className="w-5 h-5 text-rose-700" />}
            />
            <StatCard
              label="Manual Debt Entries"
              value={debts.filter(d => d.source === 'debt_entry').length}
              color="text-green-700"
              bg="bg-green-50"
              border="border-green-200"
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
            />
          </div>

          {filteredDebts.length === 0 && debts.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-8 text-center">
              <p className="text-sm text-gray-500">No entries match the current filters.</p>
              <button
                onClick={() => { setSearchQuery(''); setFilterBucket('ALL'); setStartDate(''); setEndDate(''); }}
                className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : filteredDebts.length === 0 ? (
            <ReportEmpty message="No outstanding debts found. All invoices are paid." />
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
                  {paginationUI}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Reference</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Appt Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Appt Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Practitioner</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Outstanding</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentItems.map((d) => (
                      <tr key={`${d.source}-${d.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{d.patient_name}</div>
                          <div className="text-xs text-gray-400">#{d.patient_number}</div>
                        </td>
                        <td className="px-4 py-3">
                          {d.source === 'unbilled_appointment' ? (
                            <span className="font-mono text-xs text-purple-700 font-medium">UNBILLED</span>
                          ) : (
                            <div className="font-mono text-xs text-gray-700">{d.invoice_number || '—'}</div>
                          )}
                          {d.source === 'debt_entry' && (
                            <div className="text-xs text-green-600 font-medium">Manual Entry</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {d.appointment_date ? formatDate(d.appointment_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {d.appointment_type || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {d.practitioner_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {d.due_date ? formatDate(d.due_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-700">
                          {formatPeso(d.balance_due)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                          {d.days_overdue} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50 border-t-2 border-red-200 font-bold">
                      <td colSpan={6} className="px-4 py-3 text-gray-700">Totals</td>
                      <td className="px-4 py-3 text-right text-red-700 text-base">
                        {formatPeso(filteredDebts.reduce((s, d) => s + d.balance_due, 0))}
                      </td>
                      <td colSpan={1}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-start mt-4 mb-4">
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
                {paginationUI}
              </div>
            </div>
            
            {/* Padding space to prevent UI elements from hiding behind screens */}
            <div className="h-12 w-full" />
            </>
          )}
        </div>
      )}

      {!isLoading && !error && !hasRun && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-900 font-semibold text-lg mb-1">Ageing Debts Report</p>
          <p className="text-gray-500 text-sm max-w-xs">
            Click <strong>Run Report</strong> to see all outstanding invoices categorised by how overdue they are.
          </p>
        </div>
      )}

      <AddAgeingDebtModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleEntryCreated}
      />

      <EditAgeingDebtModal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        entry={editEntry}
        onUpdated={handleEntryUpdated}
        onDeleted={handleEntryDeleted}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  );
};