import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, User, Calendar, Clock } from 'lucide-react';
import { getAppointmentClinicalNotes } from '../appointment.api';
import type { ClinicalNote } from '@/types/clinicalTemplate';

interface ClinicalNotesTabProps {
  appointmentId: number;
}

// Helper to format date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper to format time
const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const ClinicalNotesTab: React.FC<ClinicalNotesTabProps> = ({ appointmentId }) => {
  const { data: notesResponse, isLoading, error } = useQuery({
    queryKey: ['appointmentClinicalNotes', appointmentId],
    queryFn: () => getAppointmentClinicalNotes(appointmentId),
    enabled: !!appointmentId,
  });

  const clinicalNotes: ClinicalNote[] = notesResponse?.results || notesResponse || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-600">Failed to load clinical notes.</p>
      </div>
    );
  }

  if (clinicalNotes.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No clinical notes found for this appointment.</p>
        <p className="text-xs text-gray-400 mt-1">
          Clinical notes will appear here once created and linked to this session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Clinical Notes ({clinicalNotes.length})
        </h3>
      </div>

      {clinicalNotes.map((note) => (
        <div
          key={note.id}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {note.is_signed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Signed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  Draft
                </span>
              )}
              {note.template_name && (
                <span className="text-xs text-gray-500">
                  Template: {note.template_name}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {formatDate(note.date)}
            </span>
          </div>

          {/* Practitioner and timing info */}
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{note.practitioner_name || 'Unknown Practitioner'}</span>
            </div>
            {note.appointment_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(note.appointment_date)}</span>
              </div>
            )}
            {note.appointment_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(note.appointment_time)}</span>
              </div>
            )}
          </div>

          {/* Content preview */}
          {note.decrypted_content && Object.keys(note.decrypted_content).length > 0 ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">Content Preview:</p>
              <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                {Object.entries(note.decrypted_content).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="mb-1">
                    <span className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}: </span>
                    <span className="text-sm text-gray-800">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
                {Object.keys(note.decrypted_content).length > 3 && (
                  <p className="text-xs text-gray-400 italic mt-2">
                    ...and {Object.keys(note.decrypted_content).length - 3} more fields
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No content available</p>
          )}

          {/* Signed info */}
          {note.signed_at && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-green-600">
                Signed on {new Date(note.signed_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
