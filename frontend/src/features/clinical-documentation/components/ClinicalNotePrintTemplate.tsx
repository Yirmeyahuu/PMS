import React from 'react';
import type { ClinicalNote, ClinicalTemplate } from '@/types/clinicalTemplate';
import type { Appointment } from '@/types';
import { DynamicFormRenderer } from '@/features/clinical-template/components/DynamicFormRenderer';
import { SystemBranding } from '@/config/branding';
import { UserAvatar } from '@/components/UserAvatar';
import { format } from 'date-fns';

interface ClinicalNotePrintTemplateProps {
  note: ClinicalNote;
  template: ClinicalTemplate | null;
  appointment?: Appointment | null;
  patientName: string;
  clinicName?: string;
  clinicLogoUrl?: string;
  className?: string;
}

export const ClinicalNotePrintTemplate: React.FC<ClinicalNotePrintTemplateProps> = ({
  note,
  template,
  appointment,
  patientName,
  clinicName = 'Malasakit Clinic',
  clinicLogoUrl,
  className = ''
}) => {
  const noteDate = note.date ? new Date(note.date).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '';

  // Ensure content uses chart images if present
  const renderContent = { ...(note.decrypted_content || {}) };
  if (note.chart_annotation_data) {
    Object.entries(note.chart_annotation_data).forEach(([fieldId, annotationData]: [string, any]) => {
      renderContent[fieldId] = {
        canvas_image: renderContent[fieldId] || null,
        doodle_data: annotationData.doodle_data || [],
      };
    });
  }

  return (
    <div className={`bg-white max-w-[800px] mx-auto text-slate-900 font-sans shadow-xl border border-slate-200 ${className}`}>
      
      <div className="px-8 pt-8 pb-6 bg-slate-50 border-b border-slate-200">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            {clinicLogoUrl && (
              <img src={clinicLogoUrl} alt={clinicName} className="h-20 w-auto object-contain rounded-lg shadow-sm bg-white p-1" />
            )}
            <h1 className="text-2xl font-bold text-slate-900">{clinicName}</h1>
          </div>
          <div className="text-right pt-2">
            <p className="text-sm uppercase tracking-wider font-bold text-transparent bg-clip-text bg-primary-gradient">
              Clinical Note
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-5 border-t border-slate-200/60">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={note.created_by_avatar || note.practitioner_avatar}
              name={note.created_by_name || note.practitioner_name || 'Practitioner'}
              className="w-12 h-12 border-2 border-white shadow-sm ring-1 ring-slate-200"
            />
            <div>
              {appointment && appointment.date && appointment.start_time && (
                <p className="text-[15px] font-black text-slate-900 mb-1.5 tracking-tight">
                  {(() => {
                    try {
                      const [hours, minutes] = appointment.start_time.split(':');
                      const d = new Date(appointment.date);
                      d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
                      return format(d, "EEEE, do MMMM yyyy, hh:mma");
                    } catch (e) {
                      return `${appointment.date} ${appointment.start_time}`;
                    }
                  })()}
                </p>
              )}
              <p className="font-bold text-slate-900 text-lg">{note.created_by_name || note.practitioner_name || 'Practitioner'}</p>
              <p className="text-sm text-slate-600 font-medium">{note.created_by_title || 'Practitioner'}</p>
              {(note.created_by_email || note.created_by_phone) && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {[note.created_by_email, note.created_by_phone].filter(Boolean).join(' | ')}
                </p>
              )}
              {note.created_by_clinic_name && (
                <p className="text-xs text-slate-500">{note.created_by_clinic_name}</p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Document Type</p>
            <p className="font-bold text-slate-800">{template?.name || 'Note Details'}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-sm p-5 rounded-xl border border-slate-100 bg-slate-50/50">
        <div>
          <p className="text-slate-500 font-medium mb-1">Patient Name:</p>
          <p className="font-semibold">{patientName}</p>
        </div>
        <div>
          <p className="text-slate-500 font-medium mb-1">Date:</p>
          <p className="font-semibold">{noteDate}</p>
        </div>
        {appointment && (
          <div>
            <p className="text-slate-500 font-medium mb-1">Session:</p>
            <p className="font-semibold">{appointment.service_name || 'General Consultation'}</p>
          </div>
        )}
      </div>

        {template?.description && (
          <div className="mb-6">
            <p className="text-sm text-slate-500">{template.description}</p>
          </div>
        )}

        <div className="mt-4 pointer-events-none">
        {template?.structure?.sections ? (
          <DynamicFormRenderer
            sections={template.structure.sections as any}
            values={renderContent}
            onChange={() => {}}
            disabled={true}
          />
        ) : (
          <div className="text-sm text-slate-600">
            {Object.entries(renderContent).map(([key, value]) => {
              // Hide complex objects in raw fallback
              if (typeof value === 'object' && value !== null) return null;
              return (
                <div key={key} className="mb-4">
                  <p className="font-bold text-slate-700 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                  <p>{String(value)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 text-sm text-slate-500 rounded-b-xl">
        <p className="mb-1 text-xs">This document is a confidential clinical record.</p>
        <div className="flex items-center gap-1.5 mt-2 mb-4 text-xs text-slate-400">
          <span>Generated by</span>
          <img src={SystemBranding.logoColored} alt={SystemBranding.companyName} className="h-3.5 object-contain opacity-70 grayscale hover:grayscale-0 transition-all" />
          <span>on {new Date().toLocaleDateString('en-PH')}</span>
        </div>

      </div>
    </div>
  );
};
