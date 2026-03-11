import React from 'react';
import { Package, CheckCircle, Archive, AlertTriangle, Banknote } from 'lucide-react';
import type { InventoryStats } from '@/types/inventory';

interface Props { stats: InventoryStats; }

export const InventoryStatsBar: React.FC<Props> = ({ stats }) => {
  const cards = [
    {
      label: 'Total Products',
      value: stats.total_products,
      icon:  Package,
      bg:    'bg-sky-50',
      border:'border-sky-200',
      text:  'text-sky-700',
      icon_color: 'text-sky-500',
    },
    {
      label: 'Active',
      value: stats.total_active,
      icon:  CheckCircle,
      bg:    'bg-emerald-50',
      border:'border-emerald-200',
      text:  'text-emerald-700',
      icon_color: 'text-emerald-500',
    },
    {
      label: 'Low Stock',
      value: stats.low_stock_count,
      icon:  AlertTriangle,
      bg:    stats.low_stock_count > 0 ? 'bg-red-50'    : 'bg-gray-50',
      border:stats.low_stock_count > 0 ? 'border-red-200'    : 'border-gray-200',
      text:  stats.low_stock_count > 0 ? 'text-red-700'      : 'text-gray-500',
      icon_color: stats.low_stock_count > 0 ? 'text-red-500' : 'text-gray-400',
    },
    {
      label: 'Archived',
      value: stats.total_archived,
      icon:  Archive,
      bg:    'bg-slate-50',
      border:'border-slate-200',
      text:  'text-slate-600',
      icon_color: 'text-slate-400',
    },
    {
      label: 'Stock Value',
      value: `₱${parseFloat(stats.total_stock_value || '0').toLocaleString()}`,
      icon:  Banknote,
      bg:    'bg-violet-50',
      border:'border-violet-200',
      text:  'text-violet-700',
      icon_color: 'text-violet-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map(({ label, value, icon: Icon, bg, border, text, icon_color }) => (
        <div
          key={label}
          className={`rounded-xl border ${border} ${bg} p-4 flex items-center gap-3`}
        >
          <div className={`${icon_color} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[11px] font-medium ${text} opacity-70`}>{label}</p>
            <p className={`text-lg font-bold ${text}`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};