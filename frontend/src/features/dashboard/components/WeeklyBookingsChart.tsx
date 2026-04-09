import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { WeeklyBooking } from '../types/dashboard.types';

interface Props {
  data:       WeeklyBooking[];
  isLoading?: boolean;
}

// ── Custom dot ────────────────────────────────────────────────────────────────
const CustomDot = (props: {
  cx?: number; cy?: number; value?: number;
  payload?: WeeklyBooking; index?: number; dataLength?: number;
}) => {
  const { cx, cy, value } = props;
  if (cx == null || cy == null || !value) return null;
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill="#0EA5E9" stroke="#fff" strokeWidth={2}
    />
  );
};

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full inline-block bg-sky-500" />
        <span className="text-gray-500">Bookings:</span>
        <span className="font-bold text-sky-600">{payload[0].value}</span>
      </div>
    </div>
  );
};

export const WeeklyBookingsChart: React.FC<Props> = ({ data, isLoading }) => {
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
  const maxCount = data.length ? Math.max(...data.map((d) => d.count), 1) : 1;

  // Total & trend
  const total = data.reduce((s, d) => s + d.count, 0);
  const firstHalf  = data.slice(0, 3).reduce((s, d) => s + d.count, 0);
  const secondHalf = data.slice(4).reduce((s, d) => s + d.count, 0);
  const trendUp    = secondHalf >= firstHalf;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[380px] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900 leading-tight">
            Weekly Bookings (Last 7 Days)
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Total bookings per day over the past week
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Total badge */}
          <div className="text-right">
            <p className="text-xl font-bold text-sky-600 leading-tight">{total}</p>
            <p className="text-[10px] text-gray-400 leading-tight">this week</p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            trendUp ? 'bg-emerald-50' : 'bg-rose-50'
          }`}>
            <TrendingUp className={`w-5 h-5 ${trendUp ? 'text-emerald-500' : 'text-rose-400 rotate-180'}`} />
          </div>
        </div>
      </div>

      {/* Chart */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400">No booking data available</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 8, left: -10, bottom: 4 }}
            >
              <defs>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0EA5E9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, Math.ceil(maxCount * 1.25)]}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0EA5E9', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0EA5E9"
                strokeWidth={2.5}
                fill="url(#skyGrad)"
                dot={<CustomDot />}
                activeDot={{ r: 6, fill: '#0EA5E9', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
