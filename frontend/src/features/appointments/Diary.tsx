import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ChevronLeft, ChevronRight, Filter, Building2, Users } from 'lucide-react';
import { Calendar } from './Calendar';
import { ArrivalsList } from './components/ArrivalsList';
import { AddEventModal } from './components/AddEventModal';
import { AddDragEventModal } from './components/AddDragEventModal';
import { EventViewModal } from './components/EventViewModal';
import { DraggableEventButton } from './components/DraggableEventButton';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { usePractitioners } from '@/features/clinics/hooks/usePractitioners';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { useAuthStore } from '@/store/auth.store';
import type { BlockAppointment, Appointment } from '@/types';
import type { PractitionerAvailability } from '@/features/clinics/clinic.api';

type CalendarView = 'day' | 'week' | 'month';

export const Diary: React.FC = () => {
  // Get user info early for role-based logic
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isPractitioner = user?.role === 'PRACTITIONER';

  const [currentDate, setCurrentDate] = useState(new Date());
  // Default to week view for practitioners
  const [view, setView] = useState<CalendarView>('week');
  const [selectedPractitioner, setSelectedPractitioner] = useState<number | null>(null);
  const [selectedClinicBranch, setSelectedClinicBranch] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [calendarReadyDate, setCalendarReadyDate] = useState<Date | null>(null);

  // ── Admin Compare Mode State ────────────────────────────────────────────────
  const [compareMode, setCompareMode] = useState(false);
  const [comparePractitioners, setComparePractitioners] = useState<[number | null, number | null]>([null, null]);
  const [showCompareDropdownA, setShowCompareDropdownA] = useState(false);
  const [showCompareDropdownB, setShowCompareDropdownB] = useState(false);

  // Guard: only auto-select assigned clinic branch once on initial load
  const hasAutoSelectedBranch = useRef(false);

  // Fetch clinic branches
  const { branches, loading: loadingBranches } = useClinicBranches();

  // Fetch practitioners — automatically filtered by selectedClinicBranch
  const { practitioners, loading: loadingPractitioners } = usePractitioners({
    clinicBranchId: selectedClinicBranch,
  });

  // Cache the logged-in practitioner's availability AND branch assignment so they
  // survive branch switches (switching tabs refetches practitioners for that branch,
  // losing data about the practitioner's home branch).
  const [cachedOwnAvailability, setCachedOwnAvailability] = useState<PractitionerAvailability | null>(null);
  const [cachedOwnBranchId, setCachedOwnBranchId] = useState<number | null>(null);

  // Single effect: cache own availability + home branch, and auto-navigate to it once.
  useEffect(() => {
    if (!isPractitioner || !user?.practitioner_id || practitioners.length === 0) return;
    const own = practitioners.find(p => p.id === user.practitioner_id);
    if (!own) return;

    if (own.availability) setCachedOwnAvailability(own.availability);

    if (own.clinic_branch_id != null) {
      if (cachedOwnBranchId == null) setCachedOwnBranchId(own.clinic_branch_id);

      // Auto-open the practitioner's assigned clinic tab on first page load
      if (!hasAutoSelectedBranch.current) {
        hasAutoSelectedBranch.current = true;
        setSelectedClinicBranch(own.clinic_branch_id);
        setSelectedPractitioner(user.practitioner_id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPractitioner, user?.practitioner_id, practitioners]);

  // True when the currently selected branch tab is the practitioner's own home clinic.
  // Used to decide when to auto-show the overlay vs. requiring a manual filter.
  const isOwnAssignedClinic =
    isPractitioner && cachedOwnBranchId !== null && selectedClinicBranch === cachedOwnBranchId;

  // Compute the availability to pass to Calendar
  // For Practitioner users: use cached availability if not found in current branch list
  const getPractitionerAvailability = () => {
    if (!selectedPractitioner) return undefined;
    
    // First, try to find in current practitioners list
    const practitionerInList = practitioners.find(p => p.id === selectedPractitioner);
    if (practitionerInList?.availability) {
      return practitionerInList.availability;
    }
    
    // For Practitioner users: fall back to cached own availability
    if (isPractitioner && selectedPractitioner === user?.practitioner_id && cachedOwnAvailability) {
      return cachedOwnAvailability;
    }
    
    return undefined;
  };

  // Build a full availability map for ALL practitioners so Calendar can colour
  // every slot correctly even when no specific practitioner is selected.
  const availabilityMap = useMemo<Record<number, PractitionerAvailability>>(() => {
    const map: Record<number, PractitionerAvailability> = {};
    practitioners.forEach(p => {
      if (p.availability) map[p.id] = p.availability;
    });
    // Also include the cached availability for the logged-in practitioner so
    // switching branches never causes their own schedule to disappear.
    if (isPractitioner && user?.practitioner_id && cachedOwnAvailability) {
      map[user.practitioner_id] = cachedOwnAvailability;
    }
    return map;
  }, [practitioners, isPractitioner, user, cachedOwnAvailability]);

  // Which availability map to pass as allAvailabilities to Calendar:
  // - Admin: pass map only when a single manual filter is active (compare handled separately)
  // - Practitioner/Staff: single-practitioner overlay via practitionerAvailability prop;
  //   allAvailabilities always undefined (avoids showing every branch practitioner)
  const calendarAllAvailabilities = useMemo(() => {
    if (!isAdmin) return undefined;
    if (compareMode) return undefined;
    if (selectedPractitioner) return availabilityMap;
    return undefined;
  }, [isAdmin, compareMode, selectedPractitioner, availabilityMap]);

  // ── Compare mode availability ───────────────────────────────────────────────
  const compareAvailabilityA = useMemo(
    () => (comparePractitioners[0] != null
      ? practitioners.find(p => p.id === comparePractitioners[0])?.availability
      : undefined),
    [comparePractitioners, practitioners],
  );
  const compareAvailabilityB = useMemo(
    () => (comparePractitioners[1] != null
      ? practitioners.find(p => p.id === comparePractitioners[1])?.availability
      : undefined),
    [comparePractitioners, practitioners],
  );
  const comparePractitionerAName =
    practitioners.find(p => p.id === comparePractitioners[0])?.name ?? 'Practitioner A';
  const comparePractitionerBName =
    practitioners.find(p => p.id === comparePractitioners[1])?.name ?? 'Practitioner B';

  const handlePrevious = () => {
    if (view === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    if (view === 'month') setView('day');
  };

  const handlePractitionerSelect = (practitionerId: number | null) => {
    setSelectedPractitioner(practitionerId);
    setShowFilterDropdown(false);
  };

  const handleClinicBranchSelect = (branchId: number | null) => {
    setSelectedClinicBranch(branchId);
    // Always reset compare state when switching tabs
    setCompareMode(false);
    setComparePractitioners([null, null]);

    if (isPractitioner && user?.practitioner_id) {
      // If switching back to the practitioner's own assigned clinic, restore their filter
      // so their own schedule is shown automatically. In any other tab, clear the filter
      // so the calendar starts clean and a manual selection is required.
      if (branchId === cachedOwnBranchId) {
        setSelectedPractitioner(user.practitioner_id);
      } else {
        setSelectedPractitioner(null);
      }
    } else {
      // Admin / Staff: always clear filter when switching branches
      setSelectedPractitioner(null);
    }
  };

  // ── Admin Compare Mode Handlers ─────────────────────────────────────────────
  const handleSetCompareMode = (enabled: boolean) => {
    setCompareMode(enabled);
    if (!enabled) setComparePractitioners([null, null]);
  };

  const handleComparePractitionerASelect = (id: number | null) => {
    setComparePractitioners([id, comparePractitioners[1]]);
    setShowCompareDropdownA(false);
  };

  const handleComparePractitionerBSelect = (id: number | null) => {
    setComparePractitioners([comparePractitioners[0], id]);
    setShowCompareDropdownB(false);
  };

  const isDuplicateComparePractitioner =
    comparePractitioners[0] !== null &&
    comparePractitioners[1] !== null &&
    comparePractitioners[0] === comparePractitioners[1];

  const getDateRangeText = () => {
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    if (view === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  const currentMonth = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  const handleMiniCalendarSelect = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const selectedPractitionerName = practitioners.find(p => p.id === selectedPractitioner)?.name;
  const selectedBranchName = branches.find(b => b.id === selectedClinicBranch)?.name;

  // ── Add Event Modal State ───────────────────────────────────────────────────
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showDragEventModal, setShowDragEventModal] = useState(false);
  const [dragEventData, setDragEventData] = useState<{
    initialDate?: Date;
    initialStartTime?: string;
    initialEndTime?: string;
  }>({});
  const [eventRefreshKey, setEventRefreshKey] = useState(0);
  
  // Appointments from Calendar for conflict detection
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);

  // Event View Modal State
  const [showEventViewModal, setShowEventViewModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BlockAppointment | null>(null);

  const handleEventClick = (event: BlockAppointment) => {
    setSelectedEvent(event);
    setShowEventViewModal(true);
  };

  const handleEventUpdated = (updatedEvent: BlockAppointment) => {
    // Increment the refresh key to trigger Calendar to refetch block appointments
    setEventRefreshKey(prev => prev + 1);
  };

  const handleEventDeleted = (eventId: number) => {
    // Increment the refresh key to trigger Calendar to refetch block appointments
    setEventRefreshKey(prev => prev + 1);
  };

  const handleEventCreated = (_event: BlockAppointment) => {
    // Increment the refresh key to trigger Calendar to refetch block appointments
    console.log('[Diary] handleEventCreated called with event:', _event);
    setEventRefreshKey(prev => prev + 1);
  };

  // Handle drag event drop on calendar
  const handleDragEventDrop = (date: Date, hour: number, minute: number) => {
    const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    // Default 1 hour duration
    const endHour = hour + 1;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    setDragEventData({
      initialDate: date,
      initialStartTime: startTime,
      initialEndTime: endTime,
    });
    setShowDragEventModal(true);
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">

        {/* ── Branch Tabs ── */}
        {branches.length > 0 && (
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">

              {/* All Branches */}
              <button
                onClick={() => handleClinicBranchSelect(null)}
                disabled={loadingBranches}
                className={`
                  relative flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                  transition-all duration-200 border-b-2
                  ${selectedClinicBranch === null
                    ? 'bg-white text-sky-600 border-sky-500 shadow-sm'
                    : 'bg-transparent text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/50'
                  }
                  ${loadingBranches ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Building2 className="w-4 h-4" />
                <span>All Branches</span>
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
                      ? 'bg-white text-sky-600 border-sky-500 shadow-sm'
                      : 'bg-transparent text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/50'
                    }
                    ${loadingBranches ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <Building2 className="w-4 h-4" />
                  <span>{branch.name}</span>
                  {branch.is_main_branch && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      Main
                    </span>
                  )}
                  <span className="text-xs text-gray-400">• {branch.city}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left Sidebar */}
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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Today's Arrivals</h3>
              <ArrivalsList calendarReadyDate={calendarReadyDate} />
            </div>
          </div>

          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Header Controls */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">

                {/* Navigation + Practitioner Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleToday}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Today
                  </button>

                  <div className="flex items-center gap-1">
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

                  <h2 className="text-lg font-semibold text-gray-900">
                    {getDateRangeText()}
                  </h2>

                  {/* Active branch badge */}
                  {selectedBranchName && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      <Building2 className="w-3 h-3" />
                      {selectedBranchName}
                    </span>
                  )}

                  {/* Practitioner Filter / Compare Mode */}
                  <div className="flex items-center gap-2 flex-wrap">

                    {/* ── Compare Mode Toggle (Admin + Practitioner, Day/Week only) ── */}
                    {(isAdmin || isPractitioner) && (view === 'day' || view === 'week') && (
                      <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 bg-gray-50 text-xs font-medium">
                        <button
                          onClick={() => handleSetCompareMode(false)}
                          className={`px-3 py-1.5 transition-colors ${!compareMode ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Single
                        </button>
                        <button
                          onClick={() => handleSetCompareMode(true)}
                          className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${compareMode ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Users className="w-3 h-3" />
                          Compare
                        </button>
                      </div>
                    )}

                    {!compareMode ? (
                      /* ── Single Practitioner Filter Dropdown ── */
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
                            : selectedPractitionerName
                              || (isPractitioner && isOwnAssignedClinic ? 'My Schedule' : 'All Practitioners')
                          }
                        </button>

                        {showFilterDropdown && !loadingPractitioners && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                            <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">

                              {selectedClinicBranch && (
                                <div className="px-4 py-2 bg-sky-50 border-b border-sky-100">
                                  <p className="text-xs font-semibold text-sky-700">
                                    Showing practitioners for: {selectedBranchName}
                                  </p>
                                </div>
                              )}

                              {/* Default option: "My Schedule" for practitioners in own clinic,
                                  "All in [Branch]" or "All Practitioners" otherwise */}
                              <button
                                onClick={() => handlePractitionerSelect(
                                  isPractitioner && isOwnAssignedClinic && user?.practitioner_id
                                    ? user.practitioner_id
                                    : null
                                )}
                                className={`
                                  w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors
                                  ${isPractitioner && isOwnAssignedClinic
                                    ? selectedPractitioner === user?.practitioner_id ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700'
                                    : selectedPractitioner === null ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <span>
                                    {isPractitioner && isOwnAssignedClinic
                                      ? 'My Schedule'
                                      : selectedClinicBranch
                                        ? `All in ${selectedBranchName}`
                                        : 'All Practitioners'
                                    }
                                  </span>
                                  {(isPractitioner && isOwnAssignedClinic
                                    ? selectedPractitioner === user?.practitioner_id
                                    : selectedPractitioner === null) && (
                                    <span className="text-sky-600 text-base">✓</span>
                                  )}
                                </div>
                              </button>

                              <div className="border-t border-gray-200" />

                              {practitioners.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                  <p className="font-medium">No practitioners found</p>
                                  {selectedClinicBranch && (
                                    <p className="text-xs mt-1 text-gray-400">
                                      No staff assigned to this branch yet.
                                    </p>
                                  )}
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
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="truncate">
                                          {practitioner.name}
                                          {isPractitioner && practitioner.id === user?.practitioner_id && (
                                            <span className="ml-1.5 text-xs text-sky-500 font-medium">(me)</span>
                                          )}
                                        </div>
                                        {practitioner.specialization && (
                                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                                            {practitioner.specialization}
                                          </div>
                                        )}
                                        {!selectedClinicBranch && practitioner.clinic_branch_name && (
                                          <div className="text-xs text-sky-600 mt-0.5 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {practitioner.clinic_branch_name}
                                          </div>
                                        )}
                                      </div>
                                      {selectedPractitioner === practitioner.id && (
                                        <span className="text-sky-600 flex-shrink-0 text-base">✓</span>
                                      )}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* ── Compare Mode: Two Practitioner Dropdowns ── */
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Practitioner A Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowCompareDropdownA(!showCompareDropdownA)}
                            disabled={loadingPractitioners}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                              ${comparePractitioners[0]
                                ? 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }
                              ${loadingPractitioners ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            <span className="text-xs font-bold mr-0.5 text-sky-600">A:</span>
                            {loadingPractitioners ? 'Loading…' : (comparePractitionerAName !== 'Practitioner A' ? comparePractitionerAName : 'Select A')}
                          </button>
                          {showCompareDropdownA && !loadingPractitioners && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowCompareDropdownA(false)} />
                              <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-72 overflow-y-auto">
                                <div className="px-4 py-2 bg-sky-50 border-b border-sky-100">
                                  <p className="text-xs font-semibold text-sky-700">Select Practitioner A</p>
                                </div>
                                {practitioners.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleComparePractitionerASelect(p.id)}
                                    disabled={p.id === comparePractitioners[1]}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors
                                      ${comparePractitioners[0] === p.id ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700'}
                                      ${p.id === comparePractitioners[1] ? 'opacity-40 cursor-not-allowed' : ''}
                                    `}
                                  >
                                    <div className="truncate">{p.name}{isPractitioner && p.id === user?.practitioner_id && <span className="ml-1 text-xs text-sky-500">(me)</span>}</div>
                                    {p.specialization && <div className="text-xs text-gray-500 truncate">{p.specialization}</div>}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <span className="text-gray-400 font-bold text-sm">vs</span>

                        {/* Practitioner B Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowCompareDropdownB(!showCompareDropdownB)}
                            disabled={loadingPractitioners}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                              ${comparePractitioners[1]
                                ? 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }
                              ${loadingPractitioners ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            <span className="text-xs font-bold mr-0.5 text-violet-600">B:</span>
                            {loadingPractitioners ? 'Loading…' : (comparePractitionerBName !== 'Practitioner B' ? comparePractitionerBName : 'Select B')}
                          </button>
                          {showCompareDropdownB && !loadingPractitioners && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowCompareDropdownB(false)} />
                              <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-72 overflow-y-auto">
                                <div className="px-4 py-2 bg-violet-50 border-b border-violet-100">
                                  <p className="text-xs font-semibold text-violet-700">Select Practitioner B</p>
                                </div>
                                {practitioners.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleComparePractitionerBSelect(p.id)}
                                    disabled={p.id === comparePractitioners[0]}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors
                                      ${comparePractitioners[1] === p.id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-700'}
                                      ${p.id === comparePractitioners[0] ? 'opacity-40 cursor-not-allowed' : ''}
                                    `}
                                  >
                                    <div className="truncate">{p.name}{isPractitioner && p.id === user?.practitioner_id && <span className="ml-1 text-xs text-violet-500">(me)</span>}</div>
                                    {p.specialization && <div className="text-xs text-gray-500 truncate">{p.specialization}</div>}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Duplicate validation warning */}
                        {isDuplicateComparePractitioner && (
                          <span className="text-xs text-red-600 font-medium">
                            ⚠ Select two different practitioners
                          </span>
                        )}
                      </div>
                    )}

                    {/* Clear single filter:
                        - Not shown when practitioner is in own clinic viewing own schedule (that's the default)
                        - Shown when a non-default practitioner is manually selected */}
                    {!compareMode && selectedPractitioner !== null &&
                      !(isPractitioner && isOwnAssignedClinic && selectedPractitioner === user?.practitioner_id) && (
                      <button
                        onClick={() => {
                          if (isPractitioner && isOwnAssignedClinic && user?.practitioner_id) {
                            setSelectedPractitioner(user.practitioner_id);
                          } else {
                            setSelectedPractitioner(null);
                          }
                          setShowFilterDropdown(false);
                        }}
                        className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                      >
                        {isPractitioner && isOwnAssignedClinic ? 'My Schedule' : 'Clear filter'}
                      </button>
                    )}
                  </div>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setView(v);
                        if (v === 'month') handleSetCompareMode(false);
                      }}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-md transition-all capitalize
                        ${view === v
                          ? 'bg-white text-sky-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                        }
                      `}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* Add Event Button - Admin Only - Draggable */}
                {isAdmin && (
                  <DraggableEventButton onDragEnd={handleDragEventDrop} onClick={() => setShowAddEventModal(true)} />
                )}
              </div>
            </div>

            {/* Calendar */}
            <div className="flex-1 overflow-hidden p-4 bg-gray-50">
              <Calendar
                view={view}
                currentDate={currentDate}
                onDateChange={handleDateChange}
                selectedPractitionerId={compareMode ? null : selectedPractitioner}
                selectedClinicBranchId={selectedClinicBranch}
                refreshKey={eventRefreshKey}
                onEventClick={isAdmin ? handleEventClick : undefined}
                onAppointmentsReady={setCalendarAppointments}
                onCalendarReady={setCalendarReadyDate}
                practitionerAvailability={compareMode ? undefined : getPractitionerAvailability()}
                allAvailabilities={calendarAllAvailabilities}
                compareMode={(isAdmin || isPractitioner) && compareMode && !isDuplicateComparePractitioner && (view === 'day' || view === 'week')}
                compareAvailabilityA={compareAvailabilityA}
                compareAvailabilityB={compareAvailabilityB}
                comparePractitionerNames={[comparePractitionerAName, comparePractitionerBName]}
                comparePractitionerIdA={comparePractitioners[0]}
                comparePractitionerIdB={comparePractitioners[1]}
              />
            </div>

            {/* Add Event Modal */}
            <AddEventModal
              isOpen={showAddEventModal}
              onClose={() => setShowAddEventModal(false)}
              onCreated={handleEventCreated}
              selectedClinicBranchId={selectedClinicBranch}
              appointments={calendarAppointments}
            />
            {/* Add Drag Event Modal (for drag-and-drop) */}
            {showDragEventModal && dragEventData.initialDate && (
              <AddDragEventModal
                isOpen={showDragEventModal}
                onClose={() => {
                  setShowDragEventModal(false);
                  setDragEventData({});
                }}
                onCreated={handleEventCreated}
                selectedClinicBranchId={selectedClinicBranch}
                initialDate={dragEventData.initialDate}
                initialStartTime={dragEventData.initialStartTime}
                initialEndTime={dragEventData.initialEndTime}
                appointments={calendarAppointments}
              />
            )}

            {/* Event View Modal (for admin to view/edit/delete events) */}
            <EventViewModal
              isOpen={showEventViewModal}
              onClose={() => {
                setShowEventViewModal(false);
                setSelectedEvent(null);
              }}
              event={selectedEvent}
              onUpdated={handleEventUpdated}
              onDeleted={handleEventDeleted}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  date: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ date, selectedDate, onDateSelect }) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd   = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDay   = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();

  const weeks: (number | null)[][] = [];
  let days: (number | null)[] = [];

  for (let i = 0; i < startDay; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
    if (days.length === 7) { weeks.push(days); days = []; }
  }
  if (days.length > 0) {
    while (days.length < 7) days.push(null);
    weeks.push(days);
  }

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="text-xs">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center font-medium text-gray-500 py-1">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day, di) => {
            if (day === null) return <div key={di} className="aspect-square" />;
            const dayDate  = new Date(date.getFullYear(), date.getMonth(), day);
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
                key={di}
                onClick={() => onDateSelect(dayDate)}
                className={`
                  aspect-square flex items-center justify-center rounded-md transition-all hover:bg-gray-100
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