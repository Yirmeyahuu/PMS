import React, { useEffect, useState } from 'react';
import { X, Package, RefreshCw, AlertCircle } from 'lucide-react';
import type { Product, CreateProductPayload, ItemType, UnitType } from '@/types/inventory';

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onSubmit:  (data: CreateProductPayload) => void;
  isLoading: boolean;
  error?:    string | null;
  product?:  Product | null;
}

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'PCS',    label: 'Pieces' },
  { value: 'BOX',    label: 'Box' },
  { value: 'BOTTLE', label: 'Bottle' },
  { value: 'PACK',   label: 'Pack' },
  { value: 'VIAL',   label: 'Vial' },
  { value: 'TUBE',   label: 'Tube' },
  { value: 'ML',     label: 'mL' },
  { value: 'MG',     label: 'mg' },
  { value: 'G',      label: 'g' },
  { value: 'OTHER',  label: 'Other' },
];

const TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'SUPPLY',  label: 'Supply' },
];

const EMPTY: CreateProductPayload = {
  name:              '',
  sku:               '',
  barcode:           '',
  description:       '',
  item_type:         'PRODUCT',
  category:          null,
  cost_price:        '0.00',
  selling_price:     '0.00',
  unit:              'PCS',
  quantity_in_stock: '0',
  reorder_level:     '0',
  is_active:         true,
};

export const ProductFormModal: React.FC<Props> = ({
  isOpen, onClose, onSubmit, isLoading, error, product,
}) => {
  const [form, setForm] = useState<CreateProductPayload>(EMPTY);
  const isEdit          = !!product;

  useEffect(() => {
    if (product) {
      setForm({
        name:              product.name,
        sku:               product.sku,
        barcode:           product.barcode,
        description:       product.description,
        item_type:         product.item_type,
        category:          product.category,
        cost_price:        product.cost_price,
        selling_price:     product.selling_price,
        unit:              product.unit,
        quantity_in_stock: product.quantity_in_stock,
        reorder_level:     product.reorder_level,
        is_active:         product.is_active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const set = (field: keyof CreateProductPayload, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop — dark + blur */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Coloured top accent bar ── */}
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-cyan-500 to-sky-500 rounded-t-2xl" />

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-sm">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {isEdit ? 'Edit Product' : 'New Product'}
                </h2>
                <p className="text-xs text-gray-400">
                  {isEdit ? 'Update product details' : 'Add a new inventory item'}
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

          {/* ── Body ── */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

              {/* ── LEFT: Details ── */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-teal-600 uppercase tracking-widest">
                  Details
                </p>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Product Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Surgical Gloves"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select
                    value={form.item_type}
                    onChange={e => set('item_type', e.target.value as ItemType)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                  >
                    {TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sale Price + Cost Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Sale Price <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-transparent transition">
                      <span className="px-2.5 text-xs font-bold text-teal-600 bg-teal-50 border-r border-gray-200 py-2 select-none">
                        ₱
                      </span>
                      <input
                        type="number" min="0" step="0.01" required
                        value={form.selling_price}
                        onChange={e => set('selling_price', e.target.value)}
                        className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Cost Price
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-transparent transition">
                      <span className="px-2.5 text-xs font-bold text-gray-400 bg-gray-100 border-r border-gray-200 py-2 select-none">
                        ₱
                      </span>
                      <input
                        type="number" min="0" step="0.01"
                        value={form.cost_price}
                        onChange={e => set('cost_price', e.target.value)}
                        className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SKU + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">SKU</label>
                    <input
                      value={form.sku}
                      onChange={e => set('sku', e.target.value)}
                      placeholder="e.g. SKU-001"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Shown on invoices</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                    <select
                      value={form.unit}
                      onChange={e => set('unit', e.target.value as UnitType)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                    >
                      {UNIT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Initial Stock + Min Quantity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {isEdit ? 'Stock' : 'Initial Stock'}
                    </label>
                    <input
                      type="number" min="0" step="0.01"
                      value={form.quantity_in_stock}
                      onChange={e => set('quantity_in_stock', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Min. Quantity
                    </label>
                    <input
                      type="number" min="0" step="0.01"
                      value={form.reorder_level}
                      onChange={e => set('reorder_level', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Low stock alert threshold</p>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Advanced ── */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
                  Advanced
                </p>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Shown on invoices and reports…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition resize-none"
                  />
                </div>

                {/* Barcode — read-only on edit, hidden on create (auto-generated) */}
                {isEdit && product?.barcode && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Barcode
                      <span className="ml-1 text-[10px] font-normal text-gray-400">(auto-generated)</span>
                    </label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                      <span className="font-mono text-sm text-gray-700 tracking-widest flex-1">
                        {product.barcode}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Status</label>
                  <div className="flex gap-3">
                    {[
                      { value: true,  label: 'Active',   ring: 'ring-teal-400',  bg: 'bg-teal-50  text-teal-700  border-teal-200'  },
                      { value: false, label: 'Inactive', ring: 'ring-gray-300',  bg: 'bg-gray-50  text-gray-500  border-gray-200'  },
                    ].map(opt => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => set('is_active', opt.value)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                          form.is_active === opt.value
                            ? `${opt.bg} ring-2 ${opt.ring}`
                            : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margin preview card */}
                {parseFloat(form.selling_price) > 0 && parseFloat(form.cost_price) > 0 && (
                  <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 space-y-1">
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">
                      Margin Preview
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Profit per unit</span>
                      <span className="font-bold text-teal-700">
                        ₱{(parseFloat(form.selling_price) - parseFloat(form.cost_price)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Margin</span>
                      <span className="font-bold text-teal-700">
                        {(
                          ((parseFloat(form.selling_price) - parseFloat(form.cost_price)) /
                            parseFloat(form.selling_price)) *
                          100
                        ).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-sm font-semibold"
              >
                {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};