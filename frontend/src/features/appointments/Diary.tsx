import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from './Calendar';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';

type CalendarView = 'day' | 'week' | 'month';

export const Diary: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');

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

  // Get current and next month for sidebar
  const currentMonth = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  return (
    <DashboardLayout>
      <div className="h-full flex overflow-hidden">
        {/* Left Sidebar - Mini Calendars */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          {/* Current Month Mini Calendar */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <MiniCalendar date={currentMonth} selectedDate={currentDate} onDateSelect={setCurrentDate} />
          </div>

          {/* Next Month Mini Calendar */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
              {format(nextMonth, 'MMMM yyyy')}
            </h3>
            <MiniCalendar date={nextMonth} selectedDate={currentDate} onDateSelect={setCurrentDate} />
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

          {/* Calendar Content */}
          <div className="flex-1 overflow-hidden p-4 bg-gray-50">
            <Calendar view={view} currentDate={currentDate} onDateChange={setCurrentDate} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Mini Calendar Component for Sidebar
interface MiniCalendarProps {
  date: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ date, selectedDate, onDateSelect }) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  // Get first day of the week for the month (0 = Sunday, 1 = Monday)
  const startDay = (monthStart.getDay() + 6) % 7; // Convert to Monday = 0
  
  const daysInMonth = monthEnd.getDate();
  const weeks = [];
  let days = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
    
    if (days.length === 7) {
      weeks.push(days);
      days = [];
    }
  }
  
  // Add remaining days
  if (days.length > 0) {
    while (days.length < 7) {
      days.push(null);
    }
    weeks.push(days);
  }

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="text-xs">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
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