import React from 'react';
import { useSidebar } from '@/hooks/useSidebar';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardStats } from './DashboardStats';
import { BookingsChart } from './BookingsChart';
import { UncompletedNotesTable } from './UncompletedNotesTable';
import { AlertCircle } from 'lucide-react';

export const DashboardContent: React.FC = () => {
  const { isMobile, isExpanded } = useSidebar();
  const { data, isLoading, error } = useDashboardData();

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">Error Loading Dashboard</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div 
        className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm"
        style={{
          padding: isMobile ? '1rem' : (isExpanded ? '1.5rem 2rem' : '1.5rem'),
        }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
          Dashboard Overview
        </h1>
        <p className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Bento Grid Layout - Scrollable content */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{
          padding: isMobile ? '1rem' : (isExpanded ? '2rem' : '1.5rem'),
        }}
      >
        {isMobile ? (
          // Mobile: Stack vertically
          <div className="space-y-4">
            <DashboardStats 
              stats={data?.stats || {
                todayOccupancy: { current: 0, total: 0, percentage: 0 },
                todayBookings: 0,
                todayNewClients: 0,
                todayCancellations: 0
              }} 
              isLoading={isLoading}
            />
            <BookingsChart 
              data={data?.bookingsByCase || []} 
              isLoading={isLoading}
            />
            <UncompletedNotesTable 
              notes={data?.uncompletedNotes || []} 
              isLoading={isLoading}
            />
          </div>
        ) : (
          // Desktop: Bento Grid (2 columns)
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Left Column: Stats Cards */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
              <DashboardStats 
                stats={data?.stats || {
                  todayOccupancy: { current: 0, total: 0, percentage: 0 },
                  todayBookings: 0,
                  todayNewClients: 0,
                  todayCancellations: 0
                }} 
                isLoading={isLoading}
                layout="vertical"
              />
            </div>

            {/* Right Column: Chart + Table */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-6 h-full">
              {/* Bar Chart */}
              <div className="flex-shrink-0">
                <BookingsChart 
                  data={data?.bookingsByCase || []} 
                  isLoading={isLoading}
                />
              </div>

              {/* Uncompleted Notes Table - Takes remaining space */}
              <div className="flex-1 min-h-0">
                <UncompletedNotesTable 
                  notes={data?.uncompletedNotes || []} 
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};