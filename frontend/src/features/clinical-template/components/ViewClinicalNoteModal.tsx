import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, Printer, Mail, CheckCircle, Pencil } from 'lucide-react';
import { getNote, emailNote, getPrintNote } from '../clinical-templates.api';
import type { ClinicalNote, ClinicalTemplate, TemplateSection, TemplateField } from '@/types/clinicalTemplate';
import toast from 'react-hot-toast';

interface ViewClinicalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: number;
  onEdit?: (noteId: number) => void;
}

// Helper to format time
const formatTime = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper to format date
const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper to format full date
const formatFullDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const ViewClinicalNoteModal: React.FC<ViewClinicalNoteModalProps> = ({
  isOpen,
  onClose,
  noteId,
  onEdit,
}) => {
  const [note, setNote] = useState<ClinicalNote | null>(null);
  const [template, setTemplate] = useState<ClinicalTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (isOpen && noteId) {
      fetchNote();
    }
  }, [isOpen, noteId]);

  const fetchNote = async () => {
    setLoading(true);
    try {
      const noteData = await getNote(noteId);
      setNote(noteData);
      
      // Fetch template if available
      if (noteData.template) {
        const { getTemplate } = await import('../clinical-templates.api');
        const templateData = await getTemplate(noteData.template);
        setTemplate(templateData);
      }
    } catch (err) {
      console.error('Failed to load note:', err);
      toast.error('Failed to load clinical note');
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setEmailing(true);
    try {
      await emailNote(noteId);
      toast.success('Clinical note sent to patient email');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send email');
    } finally {
      setEmailing(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const printData = await getPrintNote(noteId);
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Clinical Note - ${printData.patient_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            .clinic { font-size: 18px; font-weight: bold; color: #1e40af; }
            h1 { font-size: 24px; color: #333; margin: 10px 0; }
            .info { margin-bottom: 20px; }
            .info p { margin: 5px 0; }
            .section { margin-bottom: 20px; }
            .section h3 { background: #f3f4f6; padding: 10px; margin-bottom: 10px; border-left: 4px solid #1e40af; }
            .field { margin-bottom: 10px; }
            .field label { font-weight: bold; color: #666; }
            .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="clinic">${printData.clinic_name}</div>
            <h1>Clinical Note</h1>
          </div>
          <div class="info">
            <p><strong>Patient:</strong> ${printData.patient_name}</p>
            <p><strong>Patient ID:</strong> ${printData.patient_number}</p>
            <p><strong>Date:</strong> ${printData.date ? new Date(printData.date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Practitioner:</strong> ${printData.practitioner_name}${printData.practitioner_title ? ` (${printData.practitioner_title})` : ''}</p>
            <p><strong>Template:</strong> ${printData.template_name}</p>
            ${printData.is_signed ? `<p><strong>Signed:</strong> ${printData.signed_at ? new Date(printData.signed_at).toLocaleString() : 'Yes'}</p>` : ''}
          </div>
          ${printData.sections.map(section => `
            <div class="section">
              <h3>${section.title}</h3>
              ${section.fields.map(field => `
                <div class="field">
                  <label>${field.label}:</label> ${field.value}
                </div>
              `).join('')}
            </div>
          `).join('')}
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate print view');
    } finally {
      setPrinting(false);
    }
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() 
      : name.substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Clinical Note</h2>
              <p className="text-sm text-gray-500">
                {note?.template_name || 'Clinical Note'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(noteId)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Edit Note"
              >
                <Pencil className="w-4 h-4" />
                Edit Note
              </button>
            )}
            <button
              onClick={handleEmail}
              disabled={emailing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="Send to Client Email"
            >
              {emailing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Send Email
            </button>
            <button
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
          ) : note ? (
            <div className="space-y-6">
              {/* Status Banner - Only show signed status */}
              {note.is_signed && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    This note was signed on {note.signed_at ? formatFullDate(note.signed_at) : 'N/A'}
                  </span>
                </div>
              )}

              {/* Header Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  {/* Practitioner Avatar */}
                  {note.practitioner_avatar ? (
                    <img 
                      src={note.practitioner_avatar} 
                      alt={note.practitioner_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-sky-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-sky-100 border-2 border-sky-500 flex items-center justify-center text-sky-600 font-bold text-xl shadow-sm">
                      {getInitials(note.practitioner_name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{note.practitioner_name}</h3>
                    <p className="text-sm text-gray-500">{note.template_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatFullDate(note.date)}</p>
                  </div>
                </div>
                
                {/* Patient & Session Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Patient</p>
                    <p className="font-medium text-gray-900">{note.patient_name}</p>
                  </div>
                  {note.appointment_date && (
                    <div>
                      <p className="text-xs text-gray-500">Session Date</p>
                      <p className="font-medium text-gray-900">{formatDate(note.appointment_date)}</p>
                    </div>
                  )}
                  {note.appointment_time && (
                    <div>
                      <p className="text-xs text-gray-500">Session Time</p>
                      <p className="font-medium text-gray-900">{formatTime(note.appointment_time)}</p>
                    </div>
                  )}
                  {note.appointment_service && (
                    <div>
                      <p className="text-xs text-gray-500">Service</p>
                      <p className="font-medium text-gray-900">{note.appointment_service}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Template Content */}
              {note.decrypted_content && template?.structure?.sections && (
                <div className="space-y-4">
                  {template.structure.sections.map((section: TemplateSection, sectionIndex: number) => (
                    <div key={section.id || sectionIndex} className="bg-white rounded-lg border border-gray-200">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg">
                        <h4 className="font-semibold text-sm text-gray-900">{section.title}</h4>
                        {section.description && (
                          <p className="text-xs text-gray-500">{section.description}</p>
                        )}
                      </div>
                      <div className="p-4">
                        {section.fields && (section.fields as TemplateField[]).map((field: TemplateField, fieldIndex: number) => {
                          const value = note.decrypted_content?.[field.id];
                          const displayValue = () => {
                            if (value === undefined || value === '' || value === null) {
                              return <span className="text-gray-400 italic">Not filled</span>;
                            }
                            if (typeof value === 'boolean') {
                              return value ? 'Yes' : 'No';
                            }
                            if (Array.isArray(value)) {
                              return value.length > 0 ? value.join(', ') : <span className="text-gray-400 italic">Not filled</span>;
                            }
                            return String(value);
                          };

                          return (
                            <div key={field.id || fieldIndex} className="mb-3 last:mb-0">
                              <p className="text-xs font-medium text-gray-600 mb-1">{field.label}</p>
                              <div className="text-sm text-gray-900 bg-gray-50 rounded p-2 min-h-[32px]">
                                {displayValue()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="text-xs text-gray-500 flex justify-between border-t border-gray-200 pt-4">
                <div>
                  <p>Created: {note.created_at ? new Date(note.created_at).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p>Last Updated: {note.updated_at ? new Date(note.updated_at).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No note data available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
