import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, XCircle, RefreshCw,
  Mail, Calendar, Clock, User, Users,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment } from '@/types';

interface CancelAppointmentModalProps {
  isOpen:       boolean;
  appointment:  Appointment | null;  // null when in bulk mode
  isCancelling: boolean;
  cancelError:  string | null;
  onConfirm:    (reason: string) => void;
  onClose:      () => void;
  selectedCount?: number;  // For bulk mode - number of appointments selected
}

const MAX_REASON_LENGTH = 1000;

export const CancelAppointmentModal: React.FC<CancelAppointmentModalProps> = ({
  isOpen,
  appointment,
  isCancelling,
  cancelError,
  onConfirm,
  onClose,
  selectedCount = 0,
}) => {
  const [reason, setReason] = useState('');

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isBulkMode = appointment === null && selectedCount > 0;
  
  // If in single appointment mode but no appointment provided, return null
  if (!isBulkMode && !appointment) return null;

  const charsLeft = MAX_REASON_LENGTH - reason.length;

  const handleConfirm = () => {
    onConfirm(reason.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Ctrl/Cmd+Enter as a shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleConfirm();
    }
  };

  const formattedDate = isBulkMode 
    ? `${selectedCount} appointments selected` 
    : format(new Date(appointment!.date), 'EEEE, MMMM d, yyyy');

  const fmt12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const formattedTime = isBulkMode 
    ? 'Multiple time slots' 
    : `${fmt12(appointment!.start_time)} – ${fmt12(appointment!.end_time)}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal — z-index above AppointmentView (z-50) */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {isBulkMode ? 'Cancel Appointments' : 'Cancel Appointment'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isBulkMode 
                    ? `${selectedCount} appointment(s) selected` 
                    : appointment!.patient_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isCancelling}
              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-5 space-y-4">

            {/* Appointment mini-summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="font-medium">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>
                  {isBulkMode 
                    ? 'Multiple practitioners' 
                    : (appointment!.practitioner_name
                      ? `with ${appointment!.practitioner_name}`
                      : 'Unassigned practitioner')}
                </span>
              </div>
            </div>

            {/* Warning notice */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 space-y-1">
                <p className="font-semibold">This action cannot be undone.</p>
                <p>The appointment will be marked as <strong>Cancelled</strong>.</p>
              </div>
            </div>

            {/* Email notice */}
            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
              <Mail className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-sky-700">
                A cancellation email including your reason will be{' '}
                <strong>automatically sent</strong> to the patient if they have an email on file.
              </p>
            </div>

            {/* Reason textarea */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Reason for Cancellation
                <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={e => {
                  setReason(e.target.value.slice(0, MAX_REASON_LENGTH));
                }}
                onKeyDown={handleKeyDown}
                rows={4}
                placeholder="Please provide a clear reason for cancelling this appointment…"
                disabled={isCancelling}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">
                  Optional — will be included in the cancellation email if provided.
                </p>
                <span className={`text-xs ${charsLeft < 100 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {charsLeft} left
                </span>
              </div>
            </div>

            {/* API error */}
            {cancelError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{cancelError}</p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              disabled={isCancelling}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Keep Appointment
            </button>
            <button
              onClick={handleConfirm}
              disabled={isCancelling}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Cancelling…
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Confirm Cancellation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};