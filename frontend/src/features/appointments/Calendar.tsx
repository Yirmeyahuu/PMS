import React, { useRef } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay } from 'date-fns';
import { useAppointmentModal } from './hooks/useAppointmentModal';
import { useDragSelection } from './hooks/useDragSelection';
import { AppointmentModal } from './components/AppointmentModal';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarProps {
  view: CalendarView;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ view, currentDate, onDateChange }) => {
  const { isOpen, selectedSlot, openModal, closeModal } = useAppointmentModal();
  const {
    selection,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    isSlotSelected,
    getSelectionDuration,
    getSelectionStartTime,
  } = useDragSelection();

  // Track if user is dragging or just clicking
  const isDraggingRef = useRef(false);
  const dragStartTimeRef = useRef<number>(0);

  // Generate time slots from 6 AM to 9 PM with 15-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 21; hour++) {
      const hourLabel = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      
      for (let quarter = 0; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        slots.push({
          hour,
          quarter,
          minutes,
          label: quarter === 0 ? `${hourLabel} ${period}` : '',
          time: `${hour}:${minutes.toString().padStart(2, '0')}`,
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Handle mouse down - start selection
  const handleMouseDown = (date: Date, slot: any) => {
    isDraggingRef.current = false;
    dragStartTimeRef.current = Date.now();
    startSelection(slot);
  };

  // Handle mouse enter - update selection
  const handleMouseEnter = (slot: any) => {
    if (selection.isSelecting) {
      // If mouse moved to a different slot, mark as dragging
      const currentSlotIndex = slot.hour * 4 + slot.quarter;
      const startSlotIndex = selection.startSlot 
        ? selection.startSlot.hour * 4 + selection.startSlot.quarter 
        : -1;
      
      if (currentSlotIndex !== startSlotIndex) {
        isDraggingRef.current = true;
      }
      
      updateSelection(slot);
    }
  };

  // Handle mouse up - open modal
  const handleMouseUp = (date: Date) => {
    if (selection.startSlot) {
      const duration = getSelectionDuration();
      const startTime = getSelectionStartTime();

      // Only open modal if:
      // 1. User dragged (selected multiple cells), OR
      // 2. Will be handled by double-click for single cell
      if (isDraggingRef.current && duration > 15) {
        // Drag selection - open immediately
        if (startTime) {
          openModal({
            date,
            time: `${startTime.hour}:${startTime.minutes.toString().padStart(2, '0')}`,
            hour: startTime.hour,
            minutes: startTime.minutes,
            duration,
          });
        }
      }
      // If single cell (15 min), do nothing - wait for double-click
    }
    
    endSelection();
    clearSelection();
    isDraggingRef.current = false;
  };

  // Handle double-click for single cell selection
  const handleDoubleClick = (date: Date, slot: any) => {
    // Open modal with 15-minute duration
    openModal({
      date,
      time: slot.time,
      hour: slot.hour,
      minutes: slot.minutes,
      duration: 15,
    });
  };

  // Generate week days starting from Monday
  const getWeekDays = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Generate month calendar grid
  const getMonthDays = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }

    return rows;
  };

  // Day View with Drag Selection
  if (view === 'day') {
    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
          </div>

          {/* Time Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[80px_1fr]">
              {/* Time Column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`
                      h-5 px-3 text-xs font-medium text-gray-500 text-right
                      flex items-center justify-end
                      ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                    `}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* Day Column with Drag Selection */}
              <div onMouseUp={() => handleMouseUp(currentDate)}>
                {timeSlots.map((slot, index) => {
                  const isSelected = isSlotSelected(slot);
                  
                  return (
                    <div
                      key={index}
                      onMouseDown={() => handleMouseDown(currentDate, slot)}
                      onMouseEnter={() => handleMouseEnter(slot)}
                      onDoubleClick={() => handleDoubleClick(currentDate, slot)}
                      className={`
                        h-5 transition-colors cursor-pointer relative select-none
                        ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                        ${isSelected 
                          ? 'bg-sky-200 hover:bg-sky-300' 
                          : 'hover:bg-sky-50'
                        }
                      `}
                      title={`Double-click for 15-min appointment, or click & drag to select duration`}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={isOpen}
          onClose={closeModal}
          selectedSlot={selectedSlot}
        />
      </>
    );
  }

  // Week View with Drag Selection
  if (view === 'week') {
    const weekDays = getWeekDays(currentDate);

    return (
      <>
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header with Days */}
          <div className="flex-shrink-0 grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
            <div className="p-4"></div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="p-4 text-center border-l border-gray-200"
              >
                <div className="text-xs font-medium text-gray-500 uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className="text-sm font-semibold text-gray-700 mt-1">
                  {format(day, 'd MMM')}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[80px_repeat(7,1fr)]">
              {/* Time Column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`
                      h-5 px-3 text-xs font-medium text-gray-500 text-right
                      flex items-center justify-end
                      ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                    `}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* Day Columns with Drag Selection */}
              {weekDays.map((day) => (
                <div 
                  key={day.toISOString()} 
                  className="border-l border-gray-200"
                  onMouseUp={() => handleMouseUp(day)}
                >
                  {timeSlots.map((slot, index) => {
                    const isSelected = isSlotSelected(slot);
                    
                    return (
                      <div
                        key={index}
                        onMouseDown={() => handleMouseDown(day, slot)}
                        onMouseEnter={() => handleMouseEnter(slot)}
                        onDoubleClick={() => handleDoubleClick(day, slot)}
                        className={`
                          h-5 transition-colors cursor-pointer relative select-none
                          ${slot.quarter === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}
                          ${isSelected 
                            ? 'bg-sky-200 hover:bg-sky-300' 
                            : 'hover:bg-sky-50'
                          }
                        `}
                        title={`Double-click for 15-min appointment, or click & drag to select duration`}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-sky-400 opacity-30 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={isOpen}
          onClose={closeModal}
          selectedSlot={selectedSlot}
        />
      </>
    );
  }

  // Month View (unchanged)
  if (view === 'month') {
    const monthDays = getMonthDays(currentDate);
    const weekDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex-shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekDayNames.map((day) => (
            <div
              key={day}
              className="p-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {monthDays.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
              {week.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[120px] p-3 border-r border-gray-200 last:border-r-0
                    hover:bg-sky-50 transition-colors cursor-pointer
                    ${!isSameMonth(day, currentDate) ? 'bg-gray-50' : ''}
                    ${isSameDay(day, new Date()) ? 'bg-sky-100' : ''}
                  `}
                >
                  <div
                    className={`
                      text-sm font-medium mb-2
                      ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}
                      ${isSameDay(day, new Date()) ? 'text-sky-600 font-bold' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};