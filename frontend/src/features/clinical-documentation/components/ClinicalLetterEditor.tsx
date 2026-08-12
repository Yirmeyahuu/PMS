import { useState, useEffect } from 'react';
import { Loader2, FileText, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateLetter, previewLetter } from '../api/letters.api';
import { getActiveLetterTemplates } from '../api/letterTemplates.api';
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
import { CustomOrderedList } from '../../manage/pages/clinical/components/editor/CustomOrderedList';
import { CustomBulletList } from '../../manage/pages/clinical/components/editor/CustomBulletList';
import { Indent } from '../../manage/pages/clinical/components/editor/Indent';
import { FontSize } from '../../manage/pages/clinical/components/editor/FontSize';
import { EditorToolbar } from '../../manage/pages/clinical/components/editor/EditorToolbar';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';

export const ClinicalLetterEditor = ({ initialAppointmentId }: { initialAppointmentId?: number }) => {
  const { editorContext, setEditorContext, selectedCaseId, triggerRefresh } = useClinicalWorkspace();
  const { patient } = usePatientProfileContext();
  
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const selectedTemplateId = editorContext.type === 'NEW_LETTER' ? editorContext.templateId : null;

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
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px]',
      },
    },
    content: '',
  });

  // Fetch preview when template is selected
  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedTemplateId || !patient) {
        editor?.commands.setContent('');
        return;
      }
      try {
        setIsPreviewLoading(true);
        // Pre-fill subject with template name initially
        const templates = await getActiveLetterTemplates();
        const t = templates.find(temp => temp.id === selectedTemplateId);
        if (t) setSubject(t.name);

        const data = await previewLetter({
          template_id: selectedTemplateId,
          patient_id: patient.id,
          patient_case_id: selectedCaseId || undefined,
          appointment_id: initialAppointmentId,
        });
        editor?.commands.setContent(data.content_html || '');
      } catch (err) {
        console.error('Failed to preview letter', err);
        toast.error('Failed to load letter preview');
      } finally {
        setIsPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [selectedTemplateId, patient, selectedCaseId, initialAppointmentId, editor]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !patient) {
      toast.error('Missing required data');
      return;
    }
    if (!subject) {
      toast.error('Please enter a subject');
      return;
    }

    try {
      setIsGenerating(true);
      await generateLetter({
        template_id: selectedTemplateId,
        patient_id: patient.id,
        subject,
        patient_case_id: selectedCaseId || undefined,
        appointment_id: initialAppointmentId,
        content_html: editor?.getHTML() || '',
      });
      toast.success('Letter generated successfully');
      setEditorContext({ type: 'IDLE' });
      triggerRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate letter');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!selectedTemplateId) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">New Letter</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditorContext({ type: 'IDLE' })}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
            disabled={isGenerating}
          >
            <X className="w-4 h-4" />
            Discard
          </button>
          <button
            onClick={handleSubmit}
            disabled={isGenerating || !subject || isPreviewLoading}
            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Letter
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {isPreviewLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
            
            {/* Subject Input */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Title *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                placeholder="e.g. Medical Certificate"
                required
              />
            </div>

            {/* Letter Editor using the A4 visual pagination styling */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="border-b border-slate-200 bg-slate-50 p-1">
                <EditorToolbar editor={editor} />
              </div>
              <div className="bg-slate-100 p-8 flex justify-center overflow-y-auto">
                <div 
                  className="w-[794px] min-h-[1123px] bg-white shadow-md rounded-sm p-12 cursor-text"
                  onClick={() => editor?.commands.focus()}
                  style={{
                    backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1099px, #f3f4f6 1099px, #f3f4f6 1123px)'
                  }}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
