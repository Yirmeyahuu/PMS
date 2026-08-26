import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Loader2,
  Square,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bulkCancelAppointments } from '@/features/appointments/appointment.api';
import { CancelAppointmentModal } from '@/features/appointments/components/CancelAppointmentModal';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { usePatientProfileContext } from './context/PatientProfileContext';
import {
  APPOINTMENT_TYPE_LABELS,
  getAppointmentIdsWithNotes,
  getDaysUntilAppointment,
  getStrictAppointmentStatus,
  getPaymentStatus,
  formatDate,
} from './patientProfile.utils.tsx';
import type { Appointment } from '@/types';

// ─── Time Formatter ──────────────────────────────────────────────────────────
/** Converts a "HH:MM" or "HH:MM:SS" string to 12-hour format, e.g. "2:30 PM" */
const formatTime12h = (time: string): string => {
  if (!time) return time;
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
};

// ─── Status Card Style Config ────────────────────────────────────────────────
// Pure presentation mapping — no business logic.

interface CardStatusStyle {
  borderLeft: string;
  background: string;
  badgeBg: string;
  badgeColor: string;
}

const ARRIVAL_STATUS_CARD_STYLES: Record<string, CardStatusStyle> = {
  ARRIVED: {
    borderLeft: '4px solid #7C3AED',
    background: '#F5F3FF',
    badgeBg: '#EDE9FE',
    badgeColor: '#6D28D9',
  },
  DNA: {
    borderLeft: '4px solid #DC2626',
    background: '#FEF2F2',
    badgeBg: '#FEE2E2',
    badgeColor: '#B91C1C',
  },
};

const APPOINTMENT_STATUS_CARD_STYLES: Record<string, CardStatusStyle> = {
  COMPLETED: {
    borderLeft: '4px solid #16A34A',
    background: '#F0FDF4',
    badgeBg: '#DCFCE7',
    badgeColor: '#15803D',
  },
  CONFIRMED: {
    borderLeft: '4px solid #2563EB',
    background: '#EFF6FF',
    badgeBg: '#DBEAFE',
    badgeColor: '#1D4ED8',
  },
  CANCELLED: {
    borderLeft: '4px solid #DC2626',
    background: '#FEF2F2',
    badgeBg: '#FEE2E2',
    badgeColor: '#B91C1C',
  },
  NO_SHOW: {
    borderLeft: '4px solid #6B7280',
    background: '#F9FAFB',
    badgeBg: '#F3F4F6',
    badgeColor: '#374151',
  },
  IN_PROGRESS: {
    borderLeft: '4px solid #EAB308',
    background: '#FEFCE8',
    badgeBg: '#FEF9C3',
    badgeColor: '#A16207',
  },
  CHECKED_IN: {
    borderLeft: '4px solid #EA580C',
    background: '#FFF7ED',
    badgeBg: '#FFEDD5',
    badgeColor: '#C2410C',
  },
};

/**
 * Returns card style based on arrival_status first, then falls back
 * to appointment.status, then returns null (no tint = NO_STATUS default).
 */
const getCardStatusStyle = (appointment: Appointment, hasClinicalNote: boolean): CardStatusStyle | null => {
  // arrival_status takes highest priority for visual identity
  if (appointment.arrival_status === 'ARRIVED') return ARRIVAL_STATUS_CARD_STYLES.ARRIVED;
  if (appointment.arrival_status === 'DNA')     return ARRIVAL_STATUS_CARD_STYLES.DNA;

  // Clinical note = completed visit
  if (hasClinicalNote) return APPOINTMENT_STATUS_CARD_STYLES.COMPLETED;

  // Fallback to appointment.status
  return APPOINTMENT_STATUS_CARD_STYLES[appointment.status] ?? null;
};

type AppointmentFilter = 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'UNFINISHED';
const APPOINTMENTS_PER_PAGE = 8;

const isSelectableForCancellation = (appointment: Appointment, hasClinicalNote: boolean): boolean => {
  const isCancelledOrNoShow = appointment.status === 'CANCELLED' || appointment.arrival_status === 'DNA';
  if (isCancelledOrNoShow) return false;

  // Only Upcoming and Unfinished should be cancellable.
  return !hasClinicalNote;
};

interface AppointmentRowProps {
  appointment: Appointment;
  hasClinicalNote: boolean;
  isSelectableForCancellation: boolean;
  isSelected: boolean;
  onSelect: (appointmentId: number) => void;
  onClick: (appointment: Appointment) => void;
}

const AppointmentRow = ({
  appointment,
  hasClinicalNote,
  isSelectableForCancellation,
  isSelected,
  onSelect,
  onClick,
}: AppointmentRowProps) => {
  const strictStatus = getStrictAppointmentStatus(appointment);
  const paymentStatus = getPaymentStatus(appointment);
  const cardStyle   = getCardStatusStyle(appointment, hasClinicalNote);

  // Build the card's inline styles — applied on top of Tailwind base classes
  const rowStyle: React.CSSProperties = {
    background: cardStyle?.background || '#ffffff',
  };
  const borderLeftStyle: React.CSSProperties = {
    borderLeft: cardStyle?.borderLeft || '4px solid transparent',
  };

  return (
    <tr
      onClick={() => onClick(appointment)}
      className="group cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 hover:brightness-95"
      style={rowStyle}
    >
      <td className="px-4 py-3 whitespace-nowrap" style={borderLeftStyle}>
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {isSelectableForCancellation ? (
            <button
              type="button"
              className="z-10 focus:outline-none"
              onClick={() => onSelect(appointment.id)}
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-sky-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400 hover:text-sky-500" />
              )}
            </button>
          ) : (
            <div className="w-5 h-5" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
        {formatDate(appointment.date)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {formatTime12h(appointment.start_time)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={appointment.clinic_name || '—'}>
        {appointment.clinic_name || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-[200px] truncate" title={APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}>
        {APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}
        {appointment.cancellation_reason && (
          <span className="block text-xs text-red-500 font-normal truncate mt-0.5" title={appointment.cancellation_reason}>
            Reason: {appointment.cancellation_reason}
          </span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {appointment.practitioner_name || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={appointment.patient_case_title || '—'}>
        {appointment.patient_case_title || '—'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {appointment.patient_case_payer || '—'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${strictStatus.color}`}>
          {strictStatus.icon}
          {strictStatus.label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatus.color}`}>
          {paymentStatus.icon}
          {paymentStatus.label}
        </span>
      </td>
    </tr>
  );
};

export const PatientAppointmentsPage = () => {
  const {
    patient,
    appointments,
    clinicalNotes,
    loadingAppointments,
    refreshAppointments,
  } = usePatientProfileContext();

  const [filter, setFilter] = useState<AppointmentFilter>('ALL');
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<Set<number>>(new Set());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkCancelModalOpen, setIsBulkCancelModalOpen] = useState(false);
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);
  const [bulkCancelError, setBulkCancelError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const appointmentIdsWithNotes = useMemo(() => getAppointmentIdsWithNotes(clinicalNotes), [clinicalNotes]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const hasNote = appointmentIdsWithNotes.has(appointment.id);
      const daysUntil = getDaysUntilAppointment(appointment.date);
      const isUpcoming = daysUntil >= 1;
      const notCancelled = appointment.status !== 'CANCELLED' && appointment.arrival_status !== 'DNA';
      const isUnfinished = daysUntil < 1 && !hasNote && notCancelled;

      if (filter === 'UPCOMING') return isUpcoming;
      if (filter === 'COMPLETED') return hasNote;
      if (filter === 'CANCELLED') return appointment.status === 'CANCELLED' || appointment.arrival_status === 'DNA';
      if (filter === 'UNFINISHED') return isUnfinished;
      return true;
    });
  }, [appointments, appointmentIdsWithNotes, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / APPOINTMENTS_PER_PAGE));

  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * APPOINTMENTS_PER_PAGE;
    return filteredAppointments.slice(startIndex, startIndex + APPOINTMENTS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  const selectableAppointmentIdSet = useMemo(() => {
    const ids = new Set<number>();
    appointments.forEach((appointment) => {
      const hasNote = appointmentIdsWithNotes.has(appointment.id);
      if (isSelectableForCancellation(appointment, hasNote)) {
        ids.add(appointment.id);
      }
    });
    return ids;
  }, [appointments, appointmentIdsWithNotes]);

  const selectedCancellableIds = useMemo(
    () => Array.from(selectedAppointmentIds).filter((id) => selectableAppointmentIdSet.has(id)),
    [selectedAppointmentIds, selectableAppointmentIdSet]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedAppointmentIds((prev) => {
      let hasInvalidSelection = false;
      const next = new Set<number>();

      prev.forEach((id) => {
        if (selectableAppointmentIdSet.has(id)) {
          next.add(id);
        } else {
          hasInvalidSelection = true;
        }
      });

      return hasInvalidSelection ? next : prev;
    });
  }, [selectableAppointmentIdSet]);

  const cancellableAppointments = useMemo(
    () => paginatedAppointments.filter((appointment) => {
      const hasClinicalNote = appointmentIdsWithNotes.has(appointment.id);
      return isSelectableForCancellation(appointment, hasClinicalNote);
    }),
    [paginatedAppointments, appointmentIdsWithNotes]
  );

  const allSelected = cancellableAppointments.length > 0
    && cancellableAppointments.every((appointment) => selectedAppointmentIds.has(appointment.id));

  const handleSelectAll = () => {
    const cancellableIds = cancellableAppointments.map((appointment) => appointment.id);

    if (allSelected) {
      setSelectedAppointmentIds((prev) => {
        const next = new Set(prev);
        cancellableIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }

    setSelectedAppointmentIds((prev) => {
      const next = new Set(prev);
      cancellableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleToggleSelect = (appointmentId: number) => {
    if (!selectableAppointmentIdSet.has(appointmentId)) {
      return;
    }

    const nextSelected = new Set(selectedAppointmentIds);
    if (nextSelected.has(appointmentId)) {
      nextSelected.delete(appointmentId);
    } else {
      nextSelected.add(appointmentId);
    }
    setSelectedAppointmentIds(nextSelected);
  };

  const handleBulkCancel = async (reason: string) => {
    setIsBulkCancelling(true);
    setBulkCancelError(null);

    if (selectedCancellableIds.length === 0) {
      setBulkCancelError('No eligible appointments selected for cancellation');
      setIsBulkCancelling(false);
      return;
    }

    try {
      const result = await bulkCancelAppointments({
        appointment_ids: selectedCancellableIds,
        cancellation_reason: reason,
      });

      if (result.cancelled_count > 0) {
        toast.success(`Successfully cancelled ${result.cancelled_count} appointment(s)`);
      }
      if (result.failed_count > 0) {
        toast.error(`${result.failed_count} appointment(s) could not be cancelled`);
      }

      setSelectedAppointmentIds(new Set());
      setIsBulkCancelModalOpen(false);
      await refreshAppointments();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to cancel appointments';
      setBulkCancelError(message);
      toast.error(message);
    } finally {
      setIsBulkCancelling(false);
    }
  };

  const startItemIndex = filteredAppointments.length === 0 ? 0 : (currentPage - 1) * APPOINTMENTS_PER_PAGE + 1;
  const endItemIndex = Math.min(currentPage * APPOINTMENTS_PER_PAGE, filteredAppointments.length);

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-heading text-gray-900">Appointments</h1>
              <p className="text-sm text-gray-500 mt-1">
                {patient?.full_name || 'Patient'} • {appointments.length} total appointments
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-1">
              {(['ALL', 'UPCOMING', 'COMPLETED', 'UNFINISHED', 'CANCELLED'] as const).map((nextFilter) => (
                <button
                  key={nextFilter}
                  type="button"
                  onClick={() => setFilter(nextFilter)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    filter === nextFilter
                      ? 'bg-sky-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {nextFilter.charAt(0) + nextFilter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {cancellableAppointments.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 text-xs px-2 py-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                >
                  {allSelected ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      Select All
                    </>
                  )}
                </button>
              )}

              {selectedCancellableIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBulkCancelModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel ({selectedCancellableIds.length})
                </button>
              )}
            </div>
          </div>

          {loadingAppointments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Calendar className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No appointments found</p>
              <p className="text-xs text-gray-400 mt-1">
                {filter !== 'ALL' ? `No ${filter.toLowerCase()} appointments` : 'This patient has no appointment history'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                      <div className="flex items-center gap-1">
                        {cancellableAppointments.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-gray-400 hover:text-sky-600 focus:outline-none transition-colors"
                            title={allSelected ? 'Deselect All' : 'Select All'}
                          >
                            {allSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Consultation Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Practitioner</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Case</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedAppointments.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      hasClinicalNote={appointmentIdsWithNotes.has(appointment.id)}
                      isSelectableForCancellation={isSelectableForCancellation(appointment, appointmentIdsWithNotes.has(appointment.id))}
                      isSelected={selectedAppointmentIds.has(appointment.id)}
                      onSelect={handleToggleSelect}
                      onClick={(nextAppointment) => {
                        setSelectedAppointment(nextAppointment);
                        setIsDetailOpen(true);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingAppointments && filteredAppointments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-500">
                Showing {startItemIndex}-{endItemIndex} of {filteredAppointments.length} appointments
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-xs text-gray-600 min-w-18 text-center">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AppointmentDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        patientEmail={patient?.email}
      />

      <CancelAppointmentModal
        isOpen={isBulkCancelModalOpen}
        appointment={null}
        isCancelling={isBulkCancelling}
        cancelError={bulkCancelError}
        onConfirm={handleBulkCancel}
        onClose={() => setIsBulkCancelModalOpen(false)}
        selectedCount={selectedCancellableIds.length}
      />
    </>
  );
};

export default PatientAppointmentsPage;
