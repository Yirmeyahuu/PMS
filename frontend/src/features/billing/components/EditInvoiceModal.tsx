import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import type { Invoice, CreateInvoiceVersionPayload, CreateInvoiceItemPayload } from '@/types/billing';
import { billingApi } from '@/features/billing/billing.api';
import toast from 'react-hot-toast';

interface EditInvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedInvoice: Invoice) => void;
}

interface LineItemRow extends CreateInvoiceItemPayload {
  _key: string;
}

const makeKey = () => Math.random().toString(36).slice(2);

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate]         = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [taxPct, setTaxPct]           = useState('0');
  const [notes, setNotes]             = useState('');
  const [terms, setTerms]             = useState('');
  const [philhealth, setPhilhealth]   = useState('0');
  const [hmo, setHmo]                 = useState('0');
  const [items, setItems]             = useState<LineItemRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialise from current invoice whenever it changes / modal opens
  useEffect(() => {
    if (!invoice || !isOpen) return;
    setInvoiceDate(invoice.invoice_date || '');
    setDueDate(invoice.due_date || '');
    setDiscountPct(invoice.discount_percent || '0');
    setTaxPct(invoice.tax_percent || '0');
    setNotes(invoice.notes || '');
    setTerms(invoice.terms_conditions || '');
    setPhilhealth(invoice.philhealth_coverage || '0');
    setHmo(invoice.hmo_coverage || '0');
    setItems(
      (invoice.items || []).map((item) => ({
        _key:             makeKey(),
        description:      item.description,
        quantity:         parseFloat(item.quantity),
        unit_price:       parseFloat(item.unit_price),
        discount_percent: parseFloat(item.discount_percent),
        tax_percent:      parseFloat(item.tax_percent),
        service_code:     item.service_code || '',
      }))
    );
  }, [invoice, isOpen]);

  if (!invoice || !isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, {
      _key: makeKey(), description: '', quantity: 1, unit_price: 0,
      discount_percent: 0, tax_percent: 0, service_code: '',
    }]);
  };

  const handleItemChange = (key: string, field: keyof Omit<LineItemRow, '_key'>, value: string | number) => {
    setItems((prev) => prev.map((it) => it._key === key ? { ...it, [field]: value } : it));
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it._key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (items.length === 0) {
      toast.error('At least one line item is required.');
      return;
    }

    for (const item of items) {
      if (!item.description.trim()) {
        toast.error('All line items must have a description.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreateInvoiceVersionPayload = {
        invoice_date:        invoiceDate || undefined,
        due_date:            dueDate || null,
        discount_percent:    parseFloat(discountPct) || 0,
        tax_percent:         parseFloat(taxPct) || 0,
        notes,
        terms_conditions:    terms,
        philhealth_coverage: parseFloat(philhealth) || 0,
        hmo_coverage:        parseFloat(hmo) || 0,
        items:               items.map(({ _key, ...rest }) => rest),
      };

      const updated = await billingApi.createInvoiceVersion(invoice.id, payload);
      toast.success(`Invoice saved — Version ${updated.version_number} created.`);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save invoice version.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPaid = invoice.status === 'PAID';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Invoice</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {invoice.invoice_number} — Current Version {invoice.version_number}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Paid invoice notice */}
          {isPaid && (
            <div className="mx-6 mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <strong>This invoice is marked PAID.</strong> Editing will create a new version but will
                not affect payment records or payment history.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6 max-h-[78vh] overflow-y-auto">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Line Items</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Description</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-500 w-16">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 w-28">Unit Price</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item._key}>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(item._key, 'description', e.target.value)}
                            placeholder="Service / item description"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-sky-500"
                            required
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item._key, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(item._key, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item._key)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                          No line items. Click "Add Item" to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Discounts & Tax */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Discount %</label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tax %</label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={taxPct}
                  onChange={(e) => setTaxPct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">PhilHealth (₱)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={philhealth}
                  onChange={(e) => setPhilhealth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">HMO (₱)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={hmo}
                  onChange={(e) => setHmo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
                placeholder="Internal notes..."
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Terms & Conditions</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
                placeholder="Payment terms..."
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : <><Save className="w-4 h-4" /> Save as Version {invoice.version_number + 1}</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditInvoiceModal;
