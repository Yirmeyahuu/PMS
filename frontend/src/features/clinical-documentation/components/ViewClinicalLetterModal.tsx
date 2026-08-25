import React, { useState, useEffect } from 'react';
import { X, Edit2, Copy, Mail, Printer, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Letter } from '@/features/clinical-documentation/api/letters.api';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { SendLetterEmailModal } from './SendLetterEmailModal';
import { replicateLetter, getLetter } from '../api/letters.api';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import { getMyClinic } from '@/features/clinics/clinic.api';
import type { ClinicProfile } from '@/features/clinics/clinic.api';

// TipTap Imports for Read-Only rendering
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import { CustomTableHeader } from '@/features/manage/pages/clinical/components/editor/CustomTableHeader';
import { CustomTableCell } from '@/features/manage/pages/clinical/components/editor/CustomTableCell';
import { TrailingNode } from '@/features/manage/pages/clinical/components/editor/TrailingNode';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { CustomOrderedList } from '@/features/manage/pages/clinical/components/editor/CustomOrderedList';
import { CustomBulletList } from '@/features/manage/pages/clinical/components/editor/CustomBulletList';
import { Indent } from '@/features/manage/pages/clinical/components/editor/Indent';
import { FontSize } from '@/features/manage/pages/clinical/components/editor/FontSize';
import { MergeField } from '@/features/manage/pages/clinical/components/editor/MergeField';
import { ClinicLetterhead } from './ClinicLetterhead';

interface ViewClinicalLetterModalProps {
  letterId: number;
}

export const ViewClinicalLetterModal: React.FC<ViewClinicalLetterModalProps> = ({ letterId }) => {
  const { setEditorContext } = useClinicalWorkspace();
  const { patient, cases } = usePatientProfileContext();

  const [letter, setLetter] = useState<Letter | null>(null);
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReplicating, setIsReplicating] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: false,
        bulletList: false,
      }),
      CustomOrderedList,
      CustomBulletList,
      Indent,
      Table.configure({ resizable: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      TrailingNode,
      Image.configure({ inline: true, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      FontSize,
      Underline,
      MergeField,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px]',
      },
    },
    editable: false, // READ-ONLY MODE
    content: '<p></p>',
  });

  useEffect(() => {
    const fetchLetter = async () => {
      try {
        setLoading(true);
        const [fetchedLetter, fetchedClinic] = await Promise.all([
          getLetter(letterId),
          getMyClinic()
        ]);
        setLetter(fetchedLetter);
        setClinic(fetchedClinic);

        if (editor) {
          editor.commands.setContent(fetchedLetter.content_html || '<p></p>');
        }
      } catch (err) {
        console.error('Failed to load clinical letter:', err);
        toast.error('Failed to load the letter.');
      } finally {
        setLoading(false);
      }
    };
    if (letterId && editor) fetchLetter();
  }, [letterId, editor]);

  const handleClose = () => {
    setEditorContext({ type: 'IDLE' });
  };

  const handleEdit = () => {
    setEditorContext({ type: 'EDIT_LETTER', letterId: letterId });
  };

  const handleReplicate = async () => {
    try {
      setIsReplicating(true);
      toast.loading('Replicating letter...', { id: 'replicate-toast' });
      const newLetter = await replicateLetter(letterId);
      toast.success('New Clinical Letter created.', { id: 'replicate-toast' });

      setEditorContext({ type: 'VIEW_LETTER', letterId: newLetter.id });
    } catch (err) {
      console.error('Failed to replicate letter:', err);
      toast.error('Failed to replicate letter.', { id: 'replicate-toast' });
    } finally {
      setIsReplicating(false);
    }
  };

  const handleEmail = () => {
    setIsEmailModalOpen(true);
  };

  const handlePrint = () => {
    // Generate a temporary printable window with the document contents
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <html>
          <head>
            <title>Print Letter</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              .letter-head { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
              .letter-head h2 { margin: 0; color: #333; }
              .letter-head p { color: #666; font-size: 12px; margin: 5px 0 0 0; }
              .date-block { margin-bottom: 20px; }
              .addressee-block { margin-bottom: 30px; }
              .addressee-block p { margin: 2px 0 0 0; }
              .addressee-block p.name { font-weight: bold; margin: 0; }
            </style>
          </head>
          <body>
            ${letter?.layout_letter_head && letter.clinic_profile ? `
              <div class="letter-head" style="margin-bottom: 40px; border-bottom: 1px solid #1e293b; padding-bottom: 24px; font-family: sans-serif; display: flex; align-items: center;">
                  ${letter.clinic_profile.logo ? `<img src="${letter.clinic_profile.logo}" style="max-height: 96px; max-width: 200px; margin-right: 24px; object-fit: contain; border-radius: 4px;" />` : ''}
                  <div style="display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                      <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: bold; text-transform: uppercase;">${letter.clinic_profile.name}</h2>
                      <p style="color: #334155; font-size: 12px; margin: 0;">${letter.clinic_profile.address}</p>
                      <p style="color: #334155; font-size: 12px; margin: 0;">${letter.clinic_profile.phone} | ${letter.clinic_profile.email}</p>
                  </div>
              </div>
            ` : ''}
            
            ${letter?.layout_date ? `
              <div class="date-block">
                <p>${new Date(letter.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            ` : ''}

            ${letter?.layout_addressee && patient ? `
              <div class="addressee-block">
                <p class="name">${patient.full_name || `${patient.first_name} ${patient.last_name}`}</p>
                ${patient.address ? `<p>${patient.address}</p>` : ''}
                ${(patient.city || patient.province || patient.postal_code) ? `
                  <p>${[patient.city, patient.province, patient.postal_code].filter(Boolean).join(' ')}</p>
                ` : ''}
              </div>
            ` : ''}

            <div>
              ${letter?.content_html || ''}
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Loading Clinical Letter...</p>
        </div>
      </div>
    );
  }

  if (!letter) return null;

  const caseTitle = cases.find(c => c.id === letter.patient_case)?.title || 'No Case Attached';
  const createdDate = new Date(letter.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-start justify-between shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 mt-1">
              <FileText className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Clinical Letter</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <p className="text-sm font-medium text-gray-700">{patient ? patient.full_name || `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}</p>
                <span className="text-gray-300">•</span>
                <p className="text-sm text-gray-600">{caseTitle}</p>
                <span className="text-gray-300">•</span>
                <p className="text-sm text-gray-500">Created by: {letter.practitioner_name || 'Practitioner'}</p>
                <span className="text-gray-300">•</span>
                <p className="text-sm text-gray-500">Created: {createdDate}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Native Document Viewer */}
        <div className="flex-1 bg-slate-100 p-4 sm:p-8 flex justify-center overflow-y-auto">
          <div
            className="w-[794px] min-h-[1123px] bg-white shadow-md rounded-sm p-12 flex flex-col gap-6"
            style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1099px, #f3f4f6 1099px, #f3f4f6 1123px)'
            }}
          >
            {/* Visual representation of Letterhead */}
            {letter.layout_letter_head && (
              <ClinicLetterhead profile={letter.clinic_profile} />
            )}

            {/* Visual representation of Date */}
            {letter.layout_date && (
              <div className="mb-5 font-sans">
                <p className="m-0 text-slate-800">
                  {createdDate}
                </p>
              </div>
            )}

            {/* Visual representation of Addressee */}
            {letter.layout_addressee && patient && (
              <div className="mb-8 font-sans">
                <p className="font-bold m-0 text-slate-800">{patient.full_name || `${patient.first_name} ${patient.last_name}`}</p>
                {patient.address && <p className="m-0 mt-0.5 text-slate-800">{patient.address}</p>}
                {(patient.city || patient.province || patient.postal_code) && (
                  <p className="m-0 mt-0.5 text-slate-800">
                    {[patient.city, patient.province, patient.postal_code].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
            )}

            {/* Read-Only TipTap Editor */}
            <div className={`flex-1 clinical-letter-document ${letter.layout_remove_top_space ? 'mt-0' : 'mt-8'}`}>
              <EditorContent editor={editor} className="flex-1" />
            </div>
          </div>
        </div>

        {/* Action Menu / Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-xl hover:bg-sky-100 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleReplicate}
              disabled={isReplicating}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isReplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              Replicate
            </button>
            <button
              onClick={handleEmail}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {isEmailModalOpen && (
        <SendLetterEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          letter={letter}
          patientName={patient ? patient.full_name || `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
          patientEmail={patient?.email || ''}
        />
      )}
    </div>
  );
};
