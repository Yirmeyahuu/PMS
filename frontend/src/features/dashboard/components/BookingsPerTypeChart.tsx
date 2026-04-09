import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { BookingByType } from '../types/dashboard.types';

interface Props {
  data:       BookingByType[];
  isLoading?: boolean;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: BookingByType }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const { color } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
        <span className="text-gray-500">Bookings:</span>
        <span className="font-bold text-gray-900">{payload[0].value}</span>
      </div>
    </div>
  );
};

export const BookingsPerTypeChart: React.FC<Props> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[380px] animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-2/5 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2 mb-6" />
        <div className="h-[280px] bg-gray-100 rounded-xl" />
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[380px] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900 leading-tight">
            Bookings per Appointment Type
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Clinic booking distribution by service — this month
          </p>
        </div>
        <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5 text-sky-500" />
        </div>
      </div>

      {/* Chart */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400">No bookings recorded this month</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 8, left: -10, bottom: 64 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="type"
                angle={-38}
                textAnchor="end"
                height={72}
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(14,165,233,0.06)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
