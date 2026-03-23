import React from 'react';
import {
  Edit2, Archive, RotateCcw, TrendingUp, AlertTriangle,
  ChevronUp, ChevronDown, Package,
} from 'lucide-react';
import type { ProductListItem } from '@/types/inventory';

const TYPE_BADGE: Record<string, string> = {
  PRODUCT: 'bg-sky-50   text-sky-700   border-sky-200',
  SERVICE: 'bg-purple-50 text-purple-700 border-purple-200',
  SUPPLY:  'bg-amber-50  text-amber-700  border-amber-200',
};

interface Props {
  products:  ProductListItem[];
  onEdit:    (p: ProductListItem) => void;
  onArchive: (p: ProductListItem) => void;
  onRestore: (p: ProductListItem) => void;
  onAdjust:  (p: ProductListItem) => void;
  ordering:  string;
  onOrder:   (field: string) => void;
}

const SortIcon: React.FC<{ field: string; current: string }> = ({ field, current }) => {
  if (current === field)       return <ChevronUp   className="w-3 h-3 inline ml-0.5 text-sky-500" />;
  if (current === `-${field}`) return <ChevronDown className="w-3 h-3 inline ml-0.5 text-sky-500" />;
  return null;
};

export const ProductTable: React.FC<Props> = ({
  products, onEdit, onArchive, onRestore, onAdjust, ordering, onOrder,
}) => {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Package className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No products found</p>
        <p className="text-xs mt-1">Try adjusting your filters or create a new product</p>
      </div>
    );
  }

  const th = (label: string, field?: string) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none ${
        field ? 'cursor-pointer hover:text-sky-600' : ''
      }`}
      onClick={() => field && onOrder(field)}
    >
      {label}
      {field && <SortIcon field={field} current={ordering} />}
    </th>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {th('Name',       'name')}
            {th('SKU')}
            {th('Type')}
            {th('Sale Price', 'selling_price')}
            {th('Stock',      'quantity_in_stock')}
            {th('Unit')}
            {th('Status')}
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map(p => (
            <tr
              key={p.id}
              className={`hover:bg-sky-50/40 transition-colors ${p.is_archived ? 'opacity-50' : ''}`}
            >
              {/* Name */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  {p.is_low_stock && !p.is_archived && (
                    <div title="Low stock">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    </div>
                  )}
                </div>
              </td>

              {/* SKU */}
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                {p.sku || '—'}
              </td>

              {/* Type */}
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[p.item_type] ?? ''}`}>
                  {p.item_type}
                </span>
              </td>

              {/* Sale Price */}
              <td className="px-4 py-3 font-semibold text-gray-700">
                ₱{parseFloat(p.selling_price).toLocaleString()}
              </td>

              {/* Stock */}
              <td className="px-4 py-3">
                <span className={`font-semibold ${p.is_low_stock ? 'text-red-500' : 'text-gray-800'}`}>
                  {parseFloat(p.quantity_in_stock).toLocaleString()}
                </span>
              </td>

              {/* Unit */}
              <td className="px-4 py-3 text-gray-400 text-xs">{p.unit}</td>

              {/* Status */}
              <td className="px-4 py-3">
                {p.is_archived ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    Archived
                  </span>
                ) : p.is_active ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                    Inactive
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {!p.is_archived && (
                    <>
                      <button
                        onClick={() => onAdjust(p)}
                        className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Adjust stock"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onArchive(p)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {p.is_archived && (
                    <button
                      onClick={() => onRestore(p)}
                      className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      title="Restore"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};