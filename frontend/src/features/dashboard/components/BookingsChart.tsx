import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { BookingByCase } from '../types/dashboard.types';

interface BookingsChartProps {
  data: BookingByCase[];
  isLoading?: boolean;
}

export const BookingsChart: React.FC<BookingsChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 h-[400px]">
        <div className="animate-pulse h-full">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="flex-1 bg-gray-100 rounded h-[280px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300 h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Bookings per Case
        </h2>
        <p className="text-sm text-gray-600">
          Distribution of appointments by case type
        </p>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="caseName"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              interval={0}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};