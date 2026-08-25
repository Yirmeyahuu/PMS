import { useState, useEffect } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateLetter, previewLetter } from '../api/letters.api';
import { getActiveLetterTemplates, type LetterTemplate } from '../api/letterTemplates.api';
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
import { FontSize } from '../../manage/pages/clinical/components/editor/FontSize';
import { EditorToolbar } from '../../manage/pages/clinical/components/editor/EditorToolbar';

interface GenerateLetterModalProps {
  patientId: string | number;
  preSelectedTemplateId?: number;
  preSelectedCaseId?: number;
  appointmentId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const GenerateLetterModal = ({ 
  patientId, 
  preSelectedTemplateId,
  preSelectedCaseId,
  appointmentId,
  onClose, 
  onSuccess 
}: GenerateLetterModalProps) => {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<number | ''>(preSelectedTemplateId || '');
  const [subject, setSubject] = useState('');
  const [patientCaseId] = useState<number | ''>(preSelectedCaseId || '');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4 bg-white',
      },
    },
    content: '',
  });

  // Fetch preview when template is selected
  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedTemplate) {
        editor?.commands.setContent('');
        return;
      }
      try {
        setIsPreviewLoading(true);
        const data = await previewLetter({
          template_id: Number(selectedTemplate),
          patient_id: patientId,
          patient_case_id: patientCaseId ? Number(patientCaseId) : undefined,
          appointment_id: appointmentId,
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
  }, [selectedTemplate, patientId, patientCaseId, appointmentId, editor]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getActiveLetterTemplates();
        setTemplates(data);
        if (preSelectedTemplateId) {
          const t = data.find(t => t.id === preSelectedTemplateId);
          if (t) setSubject(t.name);
        }
      } catch (error) {
        toast.error('Failed to load letter templates');
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    if (!subject) {
      toast.error('Please enter a subject');
      return;
    }

    try {
      setIsGenerating(true);
      await generateLetter({
        template_id: Number(selectedTemplate),
        patient_id: patientId,
        subject,
        patient_case_id: patientCaseId ? Number(patientCaseId) : undefined,
        appointment_id: appointmentId,
        content_html: editor?.getHTML() || '',
      });
      toast.success('Letter generated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate letter');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Generate Letter</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoadingTemplates ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 flex flex-col flex-1 overflow-hidden">
            <div className="flex gap-4 shrink-0">
              <div className="w-1/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Letter Template *</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setSelectedTemplate(val);
                    
                    // Auto-fill subject if not set
                    if (val) {
                      const template = templates.find(t => t.id === val);
                      if (template) {
                        setSubject(template.name);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="w-2/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Title *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Medical Certificate"
                  required
                />
              </div>
            </div>

            {selectedTemplate && (
              <div className="flex-1 flex flex-col min-h-[300px] mt-4 overflow-hidden border border-indigo-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/50">
                <label className="block text-sm font-medium text-slate-700 p-3 bg-slate-50 border-b border-slate-200">Letter Content *</label>
                {isPreviewLoading ? (
                  <div className="flex-1 flex justify-center items-center bg-slate-50">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="border-b border-gray-200 bg-gray-50 shrink-0">
                      <EditorToolbar editor={editor} />
                    </div>
                    <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                      <div className="max-w-[800px] mx-auto bg-white shadow border border-gray-200 min-h-full clinical-letter-document">
                         <EditorContent editor={editor} className="flex-1" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 mt-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !selectedTemplate || !subject}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Letter'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
