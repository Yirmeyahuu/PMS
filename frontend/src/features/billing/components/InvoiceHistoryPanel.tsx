import React, { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, CheckCircle2, Eye, X } from 'lucide-react';
import type { InvoiceVersion, Invoice } from '@/types/billing';
import { billingApi } from '@/features/billing/billing.api';

const fmt = (dt: string) => {
  const d = new Date(dt);
  return d.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) + ' — ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const statusColors: Record<string, string> = {
  DRAFT:          'bg-gray-100 text-gray-600',
  PENDING:        'bg-amber-100 text-amber-700',
  PAID:           'bg-emerald-100 text-emerald-700',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
  OVERDUE:        'bg-red-100 text-red-700',
  CANCELLED:      'bg-gray-100 text-gray-400',
};

interface VersionDetailProps {
  version: InvoiceVersion;
  currentVersion: number;
  onClose: () => void;
}

const VersionDetailView: React.FC<VersionDetailProps> = ({ version, currentVersion, onClose }) => {
  const isCurrentVersion = version.version_number === currentVersion;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  Version {version.version_number}
                </h2>
                {isCurrentVersion ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> CURRENT
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    HISTORICAL — Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Created {fmt(version.created_at)} by {version.created_by_name || 'System'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {/* Change Summary */}
            {Object.keys(version.change_summary || {}).length > 0 && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="text-xs font-bold text-amber-800 uppercase mb-2">Changes from previous version</h4>
                <div className="space-y-1.5">
                  {Object.entries(version.change_summary).map(([field, diff]) => {
                    if (field === 'payment_added' || field === 'payment_removed') {
                      const isAdded = field === 'payment_added';
                      const details = diff as unknown as { amount: string; method: string };
                      return (
                        <div key={field} className={`flex items-start gap-2 text-xs font-medium ${isAdded ? 'text-emerald-700' : 'text-red-700'}`}>
                          <span className="w-32 flex-shrink-0 capitalize">{field.replace(/_/g, ' ')}:</span>
                          <span>₱{parseFloat(details.amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({details.method})</span>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={field} className="flex items-start gap-2 text-xs text-amber-900">
                        <span className="font-medium w-32 flex-shrink-0 capitalize">{field.replace(/_/g, ' ')}:</span>
                        <span className="line-through text-red-500">{(diff as any).from || '—'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-emerald-700 font-medium">{(diff as any).to || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status & Dates */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <label className="text-xs text-gray-500 uppercase">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[version.status] || 'bg-gray-100 text-gray-600'}`}>
                    {version.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Invoice Date</label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(version.invoice_date).toLocaleDateString('en-PH')}
                </p>
              </div>
              {version.due_date && (
                <div>
                  <label className="text-xs text-gray-500 uppercase">Due Date</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(version.due_date).toLocaleDateString('en-PH')}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Line Items</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Description</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Unit Price</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(version.items_snapshot || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-900">{item.description}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          ₱{parseFloat(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          ₱{parseFloat(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>₱{parseFloat(version.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(version.discount_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount ({version.discount_percent}%)</span>
                  <span className="text-red-600">-₱{parseFloat(version.discount_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>₱{parseFloat(version.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Notes */}
            {version.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700">{version.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface InvoiceHistoryPanelProps {
  invoice: Invoice;
}

export const InvoiceHistoryPanel: React.FC<InvoiceHistoryPanelProps> = ({ invoice }) => {
  const [versions, setVersions]   = useState<InvoiceVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<InvoiceVersion | null>(null);

  const fetchVersions = async () => {
    if (versions.length > 0) return; // already loaded
    setIsLoading(true);
    try {
      const data = await billingApi.getInvoiceVersions(invoice.id);
      setVersions(data);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded && versions.length === 0) fetchVersions();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-600" />
          <span className="text-sm font-semibold text-gray-900">Invoice History</span>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            Version {invoice.version_number}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Loading history...</div>
          ) : versions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No version history available.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {versions.map((v) => {
                const isCurrent = v.version_number === invoice.version_number;
                return (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between px-4 py-3 ${isCurrent ? 'bg-sky-50' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {v.version_number}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            Version {v.version_number}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 border border-sky-200">
                              <CheckCircle2 className="w-3 h-3" /> CURRENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {v.created_by_name || 'System'} · {fmt(v.created_at)}
                        </p>
                        <p className="text-xs font-medium text-gray-700 mt-0.5">
                          Total: ₱{parseFloat(v.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                        {v.change_summary?.payment_added && (
                          <p className="text-xs font-medium text-emerald-600 mt-0.5">
                            Payment Added: ₱{parseFloat((v.change_summary.payment_added as any).amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({(v.change_summary.payment_added as any).method})
                          </p>
                        )}
                        {v.change_summary?.payment_removed && (
                          <p className="text-xs font-medium text-red-600 mt-0.5">
                            Payment Removed: ₱{parseFloat((v.change_summary.payment_removed as any).amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({(v.change_summary.payment_removed as any).method})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${statusColors[v.status] || 'bg-gray-100 text-gray-600'}`}>
                        {v.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersion(v);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 transition-colors bg-sky-50 px-2 py-1 rounded-md"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedVersion && (
        <VersionDetailView
          version={selectedVersion}
          currentVersion={invoice.version_number}
          onClose={() => setSelectedVersion(null)}
        />
      )}
    </div>
  );
};

export default InvoiceHistoryPanel;
