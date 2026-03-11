import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import type { ProductListItem, MovementType, StockAdjustmentPayload } from '@/types/inventory';

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  product:   ProductListItem | null;
  onSubmit:  (payload: StockAdjustmentPayload) => void;
  isLoading: boolean;
  error?:    string | null;
}

const MOVEMENT_OPTS: {
  value:   MovementType;
  label:   string;
  active:  string;
  desc:    string;
}[] = [
  { value: 'IN',         label: 'Add Stock',    active: 'bg-green-50 text-green-700 border-green-300 ring-2 ring-green-300',  desc: 'Received new stock' },
  { value: 'OUT',        label: 'Remove Stock', active: 'bg-red-50   text-red-700   border-red-300   ring-2 ring-red-300',    desc: 'Used or dispensed'  },
  { value: 'ADJUSTMENT', label: 'Set Quantity', active: 'bg-blue-50  text-blue-700  border-blue-300  ring-2 ring-blue-300',   desc: 'Correct to exact'   },
  { value: 'RETURN',     label: 'Return',       active: 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-300',  desc: 'Returned to stock'  },
];

export const StockAdjustModal: React.FC<Props> = ({
  isOpen, onClose, product, onSubmit, isLoading, error,
}) => {
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity]         = useState('');
  const [reference, setReference]       = useState('');
  const [notes, setNotes]               = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setMovementType('IN');
      setQuantity('');
      setReference('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const currentStock = parseFloat(product.quantity_in_stock) || 0;
  const qtyNum       = parseFloat(quantity)                  || 0;

  const preview =
    movementType === 'IN'  || movementType === 'RETURN' ? currentStock + qtyNum :
    movementType === 'OUT'                               ? currentStock - qtyNum :
                                                          qtyNum; // ADJUSTMENT

  const isNegative     = preview < 0;
  const isIncrease     = preview > currentStock;
  const previewColor   = isNegative  ? 'text-red-600'   : isIncrease ? 'text-green-700' : 'text-amber-600';
  const previewBg      = isNegative  ? 'bg-red-50 border-red-200' : isIncrease ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ movement_type: movementType, quantity: qtyNum.toString(), reference, notes });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-sky-500 to-sky-500" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Adjust Stock</h2>
                <p className="text-xs text-gray-400 font-medium truncate max-w-[180px]">
                  {product.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Current stock */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                  Current Stock
                </p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {currentStock.toLocaleString()}
                  <span className="text-sm font-medium text-gray-400 ml-1">{product.unit}</span>
                </p>
              </div>
              {product.is_low_stock && (
                <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold border border-red-200">
                  Low Stock
                </span>
              )}
            </div>

            {/* Action selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MOVEMENT_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMovementType(opt.value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all text-left ${
                      movementType === opt.value
                        ? opt.active
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block">{opt.label}</span>
                    <span className="text-[10px] font-normal opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                {movementType === 'ADJUSTMENT' ? 'New Quantity' : 'Quantity'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                autoFocus
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-lg font-bold bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition text-center tracking-widest"
              />
            </div>

            {/* Preview */}
            <div className={`flex items-center justify-between rounded-xl border p-3 ${previewBg}`}>
              <div className="flex items-center gap-2">
                {isIncrease
                  ? <TrendingUp  className="w-4 h-4 text-green-600" />
                  : <TrendingDown className="w-4 h-4 text-red-500"  />}
                <span className="text-sm text-gray-600 font-medium">After adjustment</span>
              </div>
              <span className={`text-lg font-bold ${previewColor}`}>
                {preview.toFixed(2)}
                <span className="text-xs font-normal text-gray-400 ml-1">{product.unit}</span>
              </span>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Reference
                <span className="ml-1 text-[10px] font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. PO-001, Invoice #…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Comment
                <span className="ml-1 text-[10px] font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Please provide a comment…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isNegative || !quantity}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-sky-500 text-white rounded-lg hover:from-teal-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-sm font-semibold"
              >
                {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Save Adjustment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};