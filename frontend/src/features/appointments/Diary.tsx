import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Building2, X } from 'lucide-react';
import { Calendar } from './Calendar';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { usePractitioners } from '@/features/clinics/hooks/usePractitioners';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';

type CalendarView = 'day' | 'week' | 'month';

export const Diary: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedPractitioner, setSelectedPractitioner] = useState<number | null>(null);
  const [selectedClinicBranch, setSelectedClinicBranch] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // ✅ Fetch clinic branches
  const { branches, loading: loadingBranches } = useClinicBranches();

  // ✅ Fetch practitioners (filtered by clinic branch if selected)
  const { practitioners, loading: loadingPractitioners } = usePractitioners({
    clinicBranchId: selectedClinicBranch
  });

  const handlePrevious = () => {
    if (view === 'day') {
      setCurrentDate(subDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    if (view === 'month') {
      setView('day');
    }
  };

  const handlePractitionerSelect = (practitionerId: number | null) => {
    setSelectedPractitioner(practitionerId);
    setShowFilterDropdown(false);
  };

  const handleClinicBranchSelect = (branchId: number | null) => {
    setSelectedClinicBranch(branchId);
    setSelectedPractitioner(null); // Reset practitioner when branch changes
  };

  const getDateRangeText = () => {
    if (view === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (view === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  const currentMonth = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  const handleMiniCalendarSelect = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const selectedPractitionerName = practitioners.find(p => p.id === selectedPractitioner)?.name;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* ✅ NEW: Browser-Style Branch Tabs */}
        {branches.length > 0 && (
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
              {/* All Branches Tab */}
              <button
                onClick={() => handleClinicBranchSelect(null)}
                disabled={loadingBranches}
                className={`
                  relative flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                  transition-all duration-200 border-b-2
                  ${selectedClinicBranch === null
                    ? 'bg-white text-sky-600 border-sky-500'
                    : 'bg-transparent text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/50'
                  }
                  ${loadingBranches ? 'opacity-50 cursor-not-allowed' : ''}
                  ${selectedClinicBranch === null ? 'shadow-sm' : ''}
                `}
              >
                <Building2 className="w-4 h-4" />
                <span>All Branches</span>
                {selectedClinicBranch === null && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />
                )}
              </button>

              {/* Individual Branch Tabs */}
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleClinicBranchSelect(branch.id)}
                  disabled={loadingBranches}
                  className={`
                    relative flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                    transition-all duration-200 border-b-2
                    ${selectedClinicBranch === branch.id
                      ? 'bg-white text-sky-600 border-sky-500'
                      : 'bg-transparent text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/50'
                    }
                    ${loadingBranches ? 'opacity-50 cursor-not-allowed' : ''}
                    ${selectedClinicBranch === branch.id ? 'shadow-sm' : ''}
                  `}
                >
                  <Building2 className="w-4 h-4" />
                  <span>{branch.name}</span>
                  {branch.is_main_branch && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      Main
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    • {branch.city}
                  </span>
                  {selectedClinicBranch === branch.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Mini Calendars */}
          <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            {/* Current Month Mini Calendar */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <MiniCalendar 
                date={currentMonth} 
                selectedDate={currentDate} 
                onDateSelect={handleMiniCalendarSelect}
              />
            </div>

            {/* Next Month Mini Calendar */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                {format(nextMonth, 'MMMM yyyy')}
              </h3>
              <MiniCalendar 
                date={nextMonth} 
                selectedDate={currentDate} 
                onDateSelect={handleMiniCalendarSelect}
              />
            </div>

            {/* Arrivals Section */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Arrivals</h3>
              <div className="text-center text-gray-400 text-sm py-8">
                No arrivals today
              </div>
            </div>
          </div>

          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Controls */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                {/* Navigation */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToday}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Today
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevious}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900 ml-2">
                    {getDateRangeText()}
                  </h2>

                  {/* Practitioner Filter */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      disabled={loadingPractitioners}
                      className={`
                        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors
                        ${selectedPractitioner 
                          ? 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }
                        ${loadingPractitioners ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <Filter className="w-4 h-4" />
                      {loadingPractitioners 
                        ? 'Loading...' 
                        : selectedPractitionerName || 'All Practitioners'
                      }
                    </button>

                    {/* Practitioner Dropdown Menu */}
                    {showFilterDropdown && !loadingPractitioners && (
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowFilterDropdown(false)}
                        />
                        
                        {/* Dropdown */}
                        <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">
                          {/* All Practitioners Option */}
                          <button
                            onClick={() => handlePractitionerSelect(null)}
                            className={`
                              w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors
                              ${selectedPractitioner === null ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700'}
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <span>All Practitioners</span>
                              {selectedPractitioner === null && (
                                <span className="text-sky-600">✓</span>
                              )}
                            </div>
                          </button>

                          <div className="border-t border-gray-200" />

                          {/* Individual Practitioners */}
                          {practitioners.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No practitioners found
                            </div>
                          ) : (
                            practitioners.map((practitioner) => (
                              <button
                                key={practitioner.id}
                                onClick={() => handlePractitionerSelect(practitioner.id)}
                                className={`
                                  w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors
                                  ${selectedPractitioner === practitioner.id 
                                    ? 'bg-sky-50 text-sky-700 font-semibold' 
                                    : 'text-gray-700'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div>{practitioner.name}</div>
                                    {practitioner.specialization && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {practitioner.specialization}
                                      </div>
                                    )}
                                    {/* Show clinic branch if filtering all branches */}
                                    {!selectedClinicBranch && practitioner.clinic_name && (
                                      <div className="text-xs text-blue-600 mt-0.5">
                                        📍 {practitioner.clinic_name}
                                      </div>
                                    )}
                                  </div>
                                  {selectedPractitioner === practitioner.id && (
                                    <span className="text-sky-600">✓</span>
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Clear Practitioner Filter Badge */}
                  {selectedPractitioner && (
                    <button
                      onClick={() => setSelectedPractitioner(null)}
                      className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setView('day')}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-all
                      ${view === 'day' 
                        ? 'bg-white text-sky-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setView('week')}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-all
                      ${view === 'week' 
                        ? 'bg-white text-sky-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setView('month')}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-all
                      ${view === 'month' 
                        ? 'bg-white text-sky-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    Month
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4 bg-gray-50">
              <Calendar 
                view={view} 
                currentDate={currentDate} 
                onDateChange={handleDateChange}
                selectedPractitionerId={selectedPractitioner}
                selectedClinicBranchId={selectedClinicBranch}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// MiniCalendar component remains the same
interface MiniCalendarProps {
  date: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ date, selectedDate, onDateSelect }) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  const startDay = (monthStart.getDay() + 6) % 7;
  
  const daysInMonth = monthEnd.getDate();
  const weeks = [];
  let days = [];
  
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
    
    if (days.length === 7) {
      weeks.push(days);
      days = [];
    }
  }
  
  if (days.length > 0) {
    while (days.length < 7) {
      days.push(null);
    }
    weeks.push(days);
  }

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="text-xs">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day, dayIndex) => {
            if (day === null) {
              return <div key={dayIndex} className="aspect-square" />;
            }

            const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
            const isSelected = 
              selectedDate.getDate() === day &&
              selectedDate.getMonth() === date.getMonth() &&
              selectedDate.getFullYear() === date.getFullYear();
            const isToday = 
              new Date().getDate() === day &&
              new Date().getMonth() === date.getMonth() &&
              new Date().getFullYear() === date.getFullYear();

            return (
              <button
                key={dayIndex}
                onClick={() => onDateSelect(dayDate)}
                className={`
                  aspect-square flex items-center justify-center rounded-md
                  transition-all hover:bg-gray-100
                  ${isSelected ? 'bg-sky-500 text-white hover:bg-sky-600' : ''}
                  ${isToday && !isSelected ? 'bg-sky-100 text-sky-700 font-semibold' : ''}
                  ${!isSelected && !isToday ? 'text-gray-700' : ''}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};