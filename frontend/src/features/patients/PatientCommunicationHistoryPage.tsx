import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mail, MessageSquare, Check, X, Send,
  Loader2, ChevronLeft, ChevronRight, MessageCircle,
  Building2, AlertCircle, Clock, CalendarDays,
  Search, XCircle, Filter
} from 'lucide-react';
import {
  communicationApi,
  type CommunicationLogEntry,
} from '@/features/setup/services/communication.api';
import { StructuredEmailPreview } from './components/StructuredEmailPreview';
import { SystemBranding } from '@/config/branding';
import { usePatientProfileContext } from './context/PatientProfileContext';

const PAGE_SIZE = 10;

import { PatientAvatar } from './components/PatientAvatar';

function formatFull(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{part}</mark> 
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Delivery Timeline (compact) ────────────────────────────────────────────
function getCommunicationDisplayType(log: CommunicationLogEntry) {
  const isDNA = log.comm_type === 'DNA_FOLLOWUP';
  const isReminder = log.comm_type === 'APPOINTMENT_REMINDER';
  const clinicText = log.clinic_name ? ` | ${log.clinic_name}` : '';

  if (isDNA && log.patient_reply === '') {
    return {
      title: `DNA Follow-up: Reschedule Your Appointment${clinicText}`,
      category: 'DNA',
      status: 'Awaiting Response',
      icon: Clock,
      color: '#F97316' // Orange
    };
  }
  if (isDNA && log.patient_reply === 'RESCHEDULE') {
    return {
      title: `DNA Follow-up: ${log.patient_name || 'Patient'} Rescheduled the Appointment${clinicText}`,
      category: 'DNA',
      status: 'Rescheduled',
      icon: CalendarDays,
      color: '#3B82F6' // Blue
    };
  }
  if (isReminder && log.patient_reply === 'Y') {
    return {
      title: `Booking: Appointment Confirmed${clinicText}`,
      category: 'Booking',
      status: 'Confirmed',
      icon: Check,
      color: '#10B981' // Green
    };
  }
  if (isReminder && log.patient_reply === 'N') {
    return {
      title: `Booking: Appointment Cancelled${clinicText}`,
      category: 'Booking',
      status: 'Cancelled',
      icon: X,
      color: '#EF4444' // Red
    };
  }
  if (isReminder && log.patient_reply === 'RESCHEDULE') {
    return {
      title: `Booking: Appointment Rescheduled${clinicText}`,
      category: 'Booking',
      status: 'Rescheduled',
      icon: CalendarDays,
      color: '#3B82F6' // Blue
    };
  }
  return null; // Fallback for unexpected data
}

// ── Inline Thread (expandable row) ────────────────────────────────────────
function InlineThread({ log, searchQuery = '', avatarUrl }: { log: CommunicationLogEntry; searchQuery?: string; avatarUrl?: string | null }) {
  const isConfirmedAppt = log.appointment_status 
    ? ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'].includes(log.appointment_status) 
    : false;
  const isCancelledAppt = log.appointment_status 
    ? ['CANCELLED', 'DNA', 'NO_SHOW'].includes(log.appointment_status) 
    : false;

  const confirmed = log.patient_reply === 'Y' || isConfirmedAppt;
  const rescheduled = log.patient_reply === 'RESCHEDULE' || log.comm_type === 'RESCHEDULE_CONFIRMATION' || log.comm_type === 'RESCHEDULE_REQUEST';
  const isFollowupLog = ['DNA_FOLLOWUP', 'REBOOK_FOLLOWUP'].includes(log.comm_type);
  const declined  = (log.patient_reply === 'N' || (isCancelledAppt && !isFollowupLog)) && !rescheduled;
  
  const isPending = !confirmed && !declined && !rescheduled && (log.status === 'SENT' || log.status === 'DELIVERED');
  const isAwaitingReply = ['APPOINTMENT_REMINDER', 'DNA_FOLLOWUP', 'REBOOK_FOLLOWUP'].includes(log.comm_type) && isPending;
  
  let cardColor = log.appointment_color;
  if (log.appointment) {
    if (confirmed) cardColor = '#10B981'; // Green
    else if (declined) cardColor = '#EF4444'; // Red
    else if (rescheduled) cardColor = '#3B82F6'; // Blue
    else if (isPending) cardColor = '#F97316'; // Orange
  }

  // Use the computed color as a subtle left border AND a very light background tint
  const borderStyle = cardColor 
    ? { borderLeftColor: cardColor, backgroundColor: `${cardColor}0D` } // ~5% opacity
    : {};
  const bgClass = cardColor 
    ? 'px-5 py-4 border-b border-gray-100 border-l-4' 
    : 'px-5 py-4 bg-gray-50/60 border-b border-gray-100 border-l-4 border-l-transparent';

  return (
    <div className={bgClass} style={borderStyle}>
      <div className="ml-11 space-y-4">

        {/* Outbound message */}
        {(!log.direction || log.direction === 'OUTBOUND') && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-linear-to-br from-sky-500 to-sky-700 flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                <Building2 className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-[11.5px] font-semibold text-gray-800">{SystemBranding.companyName}</span>
              <span className="text-[11.5px] text-gray-500">→ {log.recipient}</span>
              <span className="text-[11px] text-gray-400 ml-auto">{formatFull(log.created_at)}</span>
            </div>
            <div className="ml-7 mt-2">
              <StructuredEmailPreview text={log.body_preview} searchQuery={searchQuery} />
            </div>
            {log.error_message && (
              <div className="ml-7 mt-2 flex items-start gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-px" />
                <p className="text-[11px] text-red-600">{log.error_message}</p>
              </div>
            )}
          </div>
        )}

        {/* System Event Metadata */}
        {log.direction === 'SYSTEM' && log.event_metadata && Object.keys(log.event_metadata || {}).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-linear-to-br from-gray-500 to-gray-700 flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                <Building2 className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-[11.5px] font-semibold text-gray-800">System Event</span>
              <span className="text-[11px] text-gray-400 ml-auto">{formatFull(log.created_at)}</span>
            </div>
            <div className="ml-7 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {log.comm_type === 'RESCHEDULE_CONFIRMATION' && (
                <div className="text-[12px] text-gray-700 space-y-1">
                  <p><span className="font-semibold text-gray-500">From:</span> {log.event_metadata.old_date} at {log.event_metadata.old_time}</p>
                  <p><span className="font-semibold text-gray-500">To:</span> {log.event_metadata.new_date} at {log.event_metadata.new_time}</p>
                </div>
              )}
              {log.comm_type === 'CANCELLATION' && (
                <div className="text-[12px] text-gray-700 space-y-1">
                  <p><span className="font-semibold text-gray-500">Cancelled By:</span> {log.event_metadata.cancelled_by || 'System'}</p>
                  {log.event_metadata.reason && <p><span className="font-semibold text-gray-500">Reason:</span> {log.event_metadata.reason}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Patient reply / Status Update */}
        {(log.patient_reply || confirmed || declined || rescheduled) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PatientAvatar name={log.patient_name || '?'} avatarUrl={avatarUrl} className="w-6 h-6" />
              <span className="text-[11.5px] font-semibold text-gray-800">{log.patient_name || 'Patient'}</span>
              <span className="text-[11.5px] text-gray-500">
                {log.direction === 'INBOUND' ? 'responded' : log.patient_reply ? 'replied' : 'status updated'}
              </span>
              {log.replied_at && (
                <span className="text-[11px] text-gray-400 ml-auto">{formatFull(log.replied_at)}</span>
              )}
            </div>
            <div className={`ml-7 rounded-lg border p-3 ${
              confirmed ? 'bg-emerald-50 border-emerald-200'
              : declined ? 'bg-red-50 border-red-200'
              : rescheduled ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
            }`}>
              {confirmed && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-emerald-800">Appointment Confirmed</p>
                    <p className="text-[11px] text-emerald-600">
                      {log.patient_reply === 'Y' ? 'Patient confirmed attendance' : 'Appointment was confirmed'}
                    </p>
                  </div>
                </div>
              )}
              {declined && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-red-800">Cannot Attend</p>
                    <p className="text-[11px] text-red-600">
                      {log.patient_reply === 'N' ? 'Patient declined' : 'Appointment was cancelled'}
                    </p>
                  </div>
                </div>
              )}
              {rescheduled && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-blue-800">Rescheduled Appointment</p>
                    <p className="text-[11px] text-blue-600">
                      {log.related_appointment_date && log.related_appointment_time
                        ? `rescheduled to ${log.related_appointment_date} at ${log.related_appointment_time}`
                        : log.event_metadata?.new_date 
                        ? `rescheduled to ${log.event_metadata.new_date} at ${log.event_metadata.new_time}`
                        : 'Patient opted to reschedule'}
                    </p>
                  </div>
                </div>
              )}
              {!confirmed && !declined && !rescheduled && (
                <p className="text-[12px] text-gray-700">
                  Replied: <span className="font-semibold">&quot;{log.patient_reply}&quot;</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Awaiting reply */}
        {isAwaitingReply && (
          <div className="ml-7 flex items-center gap-2 px-3.5 py-2.5 bg-orange-50 border border-orange-200 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <p className="text-[11px] text-orange-700 font-medium">Awaiting patient response</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function PatientCommunicationHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { patient } = usePatientProfileContext();

  const [logs, setLogs]           = useState<CommunicationLogEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'NONE' | 'DAY' | 'MONTH' | 'YEAR'>('NONE');
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD or YYYY-MM or YYYY
  const [appointmentStatus, setAppointmentStatus] = useState('ALL');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = useCallback(async (p: number, q: string, dType: string, dVal: string, status: string) => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    let date_from;
    let date_to;

    if (dType === 'DAY' && dVal) {
      date_from = dVal;
      date_to = dVal;
    } else if (dType === 'MONTH' && dVal) {
      date_from = `${dVal}-01`;
      const nextMonth = new Date(date_from);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(0);
      date_to = nextMonth.toISOString().split('T')[0];
    } else if (dType === 'YEAR' && dVal) {
      date_from = `${dVal}-01-01`;
      date_to = `${dVal}-12-31`;
    }

    try {
      setLoading(true);
      const result = await communicationApi.getLogs({ 
        patient: patientId, 
        page: p, 
        page_size: PAGE_SIZE,
        search: q || undefined,
        date_from,
        date_to,
        appointment_status: status === 'ALL' ? undefined : status,
        ui_filter: 'patient_history' // Ensures backend only returns the 5 specific outcomes
      });
      setLogs(result.results);
      setTotal(result.count);
      console.log('[Communication History API] Fetched logs:', result.results);
    } catch (err: any) {
      console.error('[Communication History API] Failed to fetch:', err);
      setError(err?.message || 'An error occurred while fetching communication logs.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchLogs(page, searchQuery, dateFilterType, selectedDate, appointmentStatus);
  }, [fetchLogs, page, searchQuery, dateFilterType, selectedDate, appointmentStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setDateFilterType('NONE');
    setSelectedDate('');
    setAppointmentStatus('ALL');
    setPage(1);
  };

  const handleDateFilterChange = (type: 'NONE' | 'DAY' | 'MONTH' | 'YEAR') => {
    setDateFilterType(type);
    setSelectedDate('');
    setPage(1);
  };

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CommunicationLogEntry>;
      const updatedLog = customEvent.detail;
      setLogs(currentLogs => {
        const exists = currentLogs.some(log => log.id === updatedLog.id);
        if (exists) {
          return currentLogs.map(log => log.id === updatedLog.id ? updatedLog : log);
        } else {
          // New log created
          if (updatedLog.patient === Number(patientId) || !updatedLog.patient) {
            return [updatedLog, ...currentLogs];
          }
          return currentLogs;
        }
      });
    };
    window.addEventListener('communicationUpdated', handleUpdate);
    return () => window.removeEventListener('communicationUpdated', handleUpdate);
  }, [patientId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
            <MessageCircle className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Communication History</h2>
        </div>
        {!loading && (
          <span className="text-[11px] text-gray-400">
            {total} record{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search communications..."
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-shadow"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={dateFilterType}
              onChange={(e) => handleDateFilterChange(e.target.value as any)}
              className="text-[12px] text-gray-600 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="NONE">All Time</option>
              <option value="DAY">Day</option>
              <option value="MONTH">Month</option>
              <option value="YEAR">Year</option>
            </select>
            {dateFilterType !== 'NONE' && (
              <input
                type={dateFilterType === 'DAY' ? 'date' : dateFilterType === 'MONTH' ? 'month' : 'number'}
                min={dateFilterType === 'YEAR' ? '2000' : undefined}
                max={dateFilterType === 'YEAR' ? '2100' : undefined}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                className="ml-2 text-[12px] text-gray-700 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-sky-500"
              />
            )}
          </div>
          
          {/* Appointment Status Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={appointmentStatus}
              onChange={(e) => {
                setAppointmentStatus(e.target.value);
                setPage(1);
              }}
              className="text-[12px] text-gray-600 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rescheduled">Rescheduled</option>
            </select>
          </div>
          
          {(searchQuery || dateFilterType !== 'NONE' || appointmentStatus !== 'ALL') && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
        <div className="flex items-center justify-center py-14 gap-2">
          <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
          <span className="text-[13px] text-gray-400">Loading…</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-14 gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load communication history.
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Send className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-[13px] font-semibold text-gray-700">No communications yet</p>
          <p className="text-[12px] text-gray-400 leading-relaxed max-w-56">
            Automated messages sent to this patient will appear here.
          </p>
        </div>
      ) : (
        <>
          <div>
            {logs.map(log => {
              const display = getCommunicationDisplayType(log);
              if (!display) return null; // Should be handled by backend, but safe fallback

              const isOpen = expanded === log.id;
              const cardColor = display.color;
              
              const rowClasses = `
                relative overflow-hidden w-full text-left px-4 py-3.5 border-b border-gray-50
                flex items-center gap-3 transition-colors focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500
                border-l-4 hover:brightness-95
              `;
              const rowStyle = { 
                borderLeftColor: cardColor,
                backgroundColor: isOpen ? `${cardColor}1A` : `${cardColor}0D` // 10% and 5% opacity
              };

              const StatusIcon = display.icon;

              return (
                <div key={log.id}>
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className={rowClasses}
                    style={rowStyle}
                  >
                    {/* Status Triangle Ribbon */}
                    <div 
                      className="absolute top-0 right-0 w-0 h-0 z-10" 
                      style={{
                          borderTop: `28px solid ${cardColor}`,
                          borderLeft: '28px solid transparent'
                      }}
                    />

                    <PatientAvatar name={log.patient_name || '?'} avatarUrl={patient?.avatar} />
                    
                    <div className="flex-1 min-w-0 pr-6"> {/* Added pr-6 to prevent overlapping with triangle */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          display.category === 'DNA' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {display.category}
                        </span>
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 shrink-0">
                          {log.channel === 'SMS'
                            ? <MessageSquare className="w-2.5 h-2.5 text-amber-500" />
                            : <Mail className="w-2.5 h-2.5 text-sky-500" />
                          }
                        </div>
                        <span className="text-[11px] text-gray-400 ml-auto font-medium">
                          {formatFull(log.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] text-gray-800 font-medium truncate flex-1">
                          <Highlight text={display.title} query={searchQuery} />
                        </p>
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full`}
                            style={{ backgroundColor: `${cardColor}20`, color: cardColor }}
                          >
                            <StatusIcon className="w-2.5 h-2.5" />
                            {display.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expandable thread */}
                  {isOpen && <InlineThread log={log} searchQuery={searchQuery} avatarUrl={patient?.avatar} />}
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white shrink-0">
          <span className="text-[11px] text-gray-500">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-gray-500 px-1.5">{page}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
