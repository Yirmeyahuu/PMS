import React, { useState, useEffect } from 'react';
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, X, Coffee } from 'lucide-react';
import { fetchAvailableSlots } from '../portal.api';
import type { PortalService, PortalPractitioner } from '@/types/portal';

interface PortalAvailabilityCalendarProps {
  token:        string;
  service:      PortalService;
  practitioner: PortalPractitioner | null;
  onConfirm:    (date: string, slot: string) => void;
  onClose:      () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert "HH:MM" → "h:MM AM/PM" */
const fmt12 = (slot: string): string => {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12    = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

/** Return true if this "HH:MM" slot falls in the lunch window [12:00, 13:00) */
const isLunchSlot = (slot: string): boolean => {
  const [h, m] = slot.split(':').map(Number);
  return (h === 12) || (h === 13 && m === 0);
};

/** Return true if this "HH:MM" slot is within clinic hours [06:00, 21:00) */
const isWithinClinicHours = (slot: string): boolean => {
  const [h] = slot.split(':').map(Number);
  return h >= 6 && h < 21;
};

export const PortalAvailabilityCalendar: React.FC<PortalAvailabilityCalendarProps> = ({
  token,
  service,
  practitioner,
  onConfirm,
  onClose,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [calMonth,       setCalMonth]       = useState(new Date());
  const [selectedDate,   setSelectedDate]   = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot,   setSelectedSlot]   = useState<string>('');
  const [loadingSlots,   setLoadingSlots]   = useState(false);

  // ── Fetch available slots whenever date changes ──────────────────────────
  useEffect(() => {
    if (!selectedDate) return;
    setAvailableSlots([]);
    setSelectedSlot('');
    setLoadingSlots(true);

    fetchAvailableSlots(token, service.id, selectedDate, practitioner?.id ?? null)
      .then((r) => setAvailableSlots(r.slots ?? []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, token, service.id, practitioner?.id]);

  // ── Calendar grid ────────────────────────────────────────────────────────
  const gridStart = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(calMonth),     { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(cur); cur = addDays(cur, 1); }
    weeks.push(week);
  }

  const handleDateClick = (date: Date) => {
    const str = format(date, 'yyyy-MM-dd');
    if (str < todayStr || !isSameMonth(date, calMonth)) return;
    setSelectedDate(str);
  };

  // ── Filter + split slots into morning / afternoon ─────────────────────────
  const visibleSlots = availableSlots.filter(
    s => isWithinClinicHours(s) && !isLunchSlot(s)
  );

  const morningSlots   = visibleSlots.filter(s => {
    const [h] = s.split(':').map(Number);
    return h < 12;
  });
  const afternoonSlots = visibleSlots.filter(s => {
    const [h] = s.split(':').map(Number);
    return h >= 13;
  });

  // Were any slots removed because they fell in lunch / outside hours?
  const hiddenCount = availableSlots.length - visibleSlots.length;

  const weekDayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden w-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-teal-50 border-b border-teal-100">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
            Pick Date &amp; Time
          </p>
          <p className="text-xs font-bold text-gray-800 truncate">{service.name}</p>
          {practitioner?.id != null && (
            <p className="text-[10px] text-gray-500 truncate">with {practitioner.full_name}</p>
          )}
        </div>
        {/* Clinic hours badge */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-teal-600 font-medium bg-teal-100 rounded-full px-2 py-0.5 mr-2 whitespace-nowrap">
          <Clock className="w-2.5 h-2.5" />
          6 AM – 9 PM
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 rounded-md hover:bg-teal-100 text-gray-400 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">

        {/* ── Month navigation ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCalMonth(subMonths(calMonth, 1))}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {format(calMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCalMonth(addMonths(calMonth, 1))}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Weekday labels ── */}
        <div className="grid grid-cols-7">
          {weekDayLabels.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 pb-1">
              {d}
            </div>
          ))}
        </div>

        {/* ── Days grid ── */}
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((date, di) => {
                const dateStr    = format(date, 'yyyy-MM-dd');
                const isPast     = dateStr < todayStr;
                const isOther    = !isSameMonth(date, calMonth);
                const isToday    = isSameDay(date, new Date());
                const isSelected = dateStr === selectedDate;
                const disabled   = isPast || isOther;

                return (
                  <button
                    key={di}
                    onClick={() => handleDateClick(date)}
                    disabled={disabled}
                    className={`
                      h-8 w-full flex items-center justify-center
                      text-xs font-medium rounded-md transition-all
                      ${disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : isSelected
                          ? 'bg-gray-800 text-white shadow-sm'
                          : isToday
                            ? 'bg-teal-100 text-teal-700 font-bold hover:bg-teal-200'
                            : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Available time slots ── */}
        {selectedDate && (
          <div className="border-t border-gray-100 pt-3 space-y-3">

            {/* Label row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Available Times — {format(new Date(selectedDate + 'T00:00:00'), 'EEE, MMM d')}
                </p>
              </div>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {service.duration_minutes} min
              </span>
            </div>

            {/* Loading */}
            {loadingSlots && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
              </div>
            )}

            {/* No slots */}
            {!loadingSlots && visibleSlots.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-4 bg-gray-50 rounded-md">
                No available slots for this date. Try another day.
              </p>
            )}

            {/* ── Morning slots ── */}
            {!loadingSlots && morningSlots.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Morning
                </p>
                <div className="flex flex-wrap gap-2">
                  {morningSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`
                        px-3 py-1.5 text-xs font-semibold rounded-md border transition-all
                        ${selectedSlot === slot
                          ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50'
                        }
                      `}
                    >
                      {fmt12(slot)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Lunch break banner ── */}
            {!loadingSlots && visibleSlots.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Coffee className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                    Lunch Break
                  </p>
                  <p className="text-[10px] text-amber-600">
                    12:00 PM – 1:00 PM · No appointments available
                  </p>
                </div>
              </div>
            )}

            {/* ── Afternoon slots ── */}
            {!loadingSlots && afternoonSlots.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Afternoon
                </p>
                <div className="flex flex-wrap gap-2">
                  {afternoonSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`
                        px-3 py-1.5 text-xs font-semibold rounded-md border transition-all
                        ${selectedSlot === slot
                          ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50'
                        }
                      `}
                    >
                      {fmt12(slot)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note if backend returned slots outside clinic hours */}
            {!loadingSlots && hiddenCount > 0 && (
              <p className="text-[10px] text-gray-400 text-center">
                {hiddenCount} slot{hiddenCount > 1 ? 's' : ''} outside clinic hours hidden
              </p>
            )}
          </div>
        )}

        {/* ── Confirm button ── */}
        {selectedDate && selectedSlot && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => onConfirm(selectedDate, selectedSlot)}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
            >
              Confirm — {format(new Date(selectedDate + 'T00:00:00'), 'MMM d')} at {fmt12(selectedSlot)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};