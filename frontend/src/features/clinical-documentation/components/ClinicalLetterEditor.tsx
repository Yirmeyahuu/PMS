import { useState, useEffect } from 'react';
import { Loader2, FileText, Check, X, LayoutTemplate } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateLetter, previewLetter, getLetter, updateLetter } from '../api/letters.api';
import { getActiveLetterTemplates } from '../api/letterTemplates.api';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';
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
import Placeholder from '@tiptap/extension-placeholder';
import { CustomOrderedList } from '../../manage/pages/clinical/components/editor/CustomOrderedList';
import { CustomBulletList } from '../../manage/pages/clinical/components/editor/CustomBulletList';
import { Indent } from '../../manage/pages/clinical/components/editor/Indent';
import { FontSize } from '../../manage/pages/clinical/components/editor/FontSize';
import { EditorToolbar } from '../../manage/pages/clinical/components/editor/EditorToolbar';
import { CustomShortcuts } from '../../manage/pages/clinical/components/editor/CustomShortcuts';
import { MergeField } from '../../manage/pages/clinical/components/editor/MergeField';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';

export const ClinicalLetterEditor = ({ initialAppointmentId }: { initialAppointmentId?: number }) => {
  const { editorContext, setEditorContext, selectedCaseId, triggerRefresh } = useClinicalWorkspace();
  const { patient } = usePatientProfileContext();
  
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const initialTemplateId = editorContext.type === 'NEW_LETTER' ? editorContext.templateId : null;
  const editingLetterId = editorContext.type === 'EDIT_LETTER' ? editorContext.letterId : null;
  
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(initialTemplateId);
  const [availableTemplates, setAvailableTemplates] = useState<LetterTemplate[]>([]);

  // Layout Controls State
  const [layoutLetterHead, setLayoutLetterHead] = useState(true);
  const [layoutRemoveTopSpace, setLayoutRemoveTopSpace] = useState(false);
  const [layoutDate, setLayoutDate] = useState(true);
  const [layoutAddressee, setLayoutAddressee] = useState(true);

  // Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templates = await getActiveLetterTemplates();
        setAvailableTemplates(templates);
      } catch (err) {
        console.error('Failed to load letter templates', err);
      }
    };
    fetchTemplates();
  }, []);

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
      CustomShortcuts,
      Placeholder.configure({
        placeholder: 'Type your letter here or insert placeholders...',
      }),
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
      if (!activeTemplateId || !patient) {
        editor?.commands.setContent('');
        return;
      }
      try {
        setIsPreviewLoading(true);
        // Pre-fill subject and layout defaults from template if changing template
        const t = availableTemplates.find(temp => temp.id === activeTemplateId);
        let currentLetterHead = layoutLetterHead;
        let currentRemoveTopSpace = layoutRemoveTopSpace;
        let currentDate = layoutDate;
        let currentAddressee = layoutAddressee;
        
        if (t && subject === '') {
          setSubject(t.name);
          currentLetterHead = t.layout_letter_head ?? true;
          currentRemoveTopSpace = t.layout_remove_top_space ?? false;
          currentDate = t.layout_date ?? true;
          currentAddressee = t.layout_addressee ?? true;
          setLayoutLetterHead(currentLetterHead);
          setLayoutRemoveTopSpace(currentRemoveTopSpace);
          setLayoutDate(currentDate);
          setLayoutAddressee(currentAddressee);
        }

        const data = await previewLetter({
          template_id: activeTemplateId,
          patient_id: patient.id,
          patient_case_id: selectedCaseId || undefined,
          appointment_id: initialAppointmentId,
          layout_letter_head: currentLetterHead,
          layout_remove_top_space: currentRemoveTopSpace,
          layout_date: currentDate,
          layout_addressee: currentAddressee,
        });
        editor?.commands.setContent(data.content_html || '');
      } catch (err) {
        console.error('Failed to preview letter', err);
        toast.error('Failed to load letter preview');
      } finally {
        setIsPreviewLoading(false);
      }
    };
    
    // Only run when templates are loaded if activeTemplateId is set, and we are NOT editing
    if (!editingLetterId && (availableTemplates.length > 0 || !activeTemplateId)) {
       fetchPreview();
    }
  }, [activeTemplateId, patient, selectedCaseId, initialAppointmentId, editor, availableTemplates.length, editingLetterId]);

  // Fetch letter if editing
  useEffect(() => {
    if (editingLetterId && editor) {
      const fetchEditingLetter = async () => {
        try {
          setIsPreviewLoading(true);
          const letter = await getLetter(editingLetterId);
          setSubject(letter.subject);
          setActiveTemplateId(letter.template || null);
          
          setLayoutLetterHead(letter.layout_letter_head ?? true);
          setLayoutRemoveTopSpace(letter.layout_remove_top_space ?? false);
          setLayoutDate(letter.layout_date ?? true);
          setLayoutAddressee(letter.layout_addressee ?? true);
          
          editor.commands.setContent(letter.content_html || '');
        } catch (err) {
          console.error('Failed to load letter for editing', err);
          toast.error('Failed to load letter');
        } finally {
          setIsPreviewLoading(false);
        }
      };
      fetchEditingLetter();
    }
  }, [editingLetterId, editor]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newId = value ? parseInt(value, 10) : null;
    
    if (editor && !editor.isEmpty) {
      if (!confirm('Changing templates will discard your current changes. Proceed?')) {
        return;
      }
    }
    
    setActiveTemplateId(newId);
    if (!newId) {
      editor?.commands.setContent('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) {
      toast.error('Missing required data');
      return;
    }
    if (!subject) {
      toast.error('Please enter a subject');
      return;
    }

    try {
      setIsGenerating(true);
      
      let savedLetterId: number;

      if (editingLetterId) {
        // Update existing letter
        const updated = await updateLetter(editingLetterId, {
          subject,
          patient_case: selectedCaseId || undefined,
          content_html: editor?.getHTML() || '',
          layout_letter_head: layoutLetterHead,
          layout_remove_top_space: layoutRemoveTopSpace,
          layout_date: layoutDate,
          layout_addressee: layoutAddressee,
        });
        savedLetterId = updated.id;
        toast.success('Letter updated successfully');
      } else {
        // Create new letter
        const created = await generateLetter({
          template_id: activeTemplateId || 0,
          patient_id: patient.id,
          subject,
          patient_case_id: selectedCaseId || undefined,
          appointment_id: initialAppointmentId,
          content_html: editor?.getHTML() || '',
          layout_letter_head: layoutLetterHead,
          layout_remove_top_space: layoutRemoveTopSpace,
          layout_date: layoutDate,
          layout_addressee: layoutAddressee,
        });
        savedLetterId = created.id;
        toast.success('Letter generated successfully');
      }

      setEditorContext({ type: 'VIEW_LETTER', letterId: savedLetterId });
      triggerRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save letter');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{editingLetterId ? 'Edit Letter' : 'New Letter'}</h2>
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
          <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
            
            {/* Subject and Template Input */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Template</label>
                <select
                  value={activeTemplateId || ''}
                  onChange={handleTemplateChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="">Blank Letter</option>
                  {availableTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
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
            </div>

            <div className="flex gap-4 flex-1">
              {/* Letter Editor using the A4 visual pagination styling */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="border-b border-slate-200 bg-slate-50 p-1">
                  <EditorToolbar editor={editor} />
                </div>
                <div className="bg-slate-100 p-8 flex justify-center overflow-y-auto">
                  <div 
                    className="w-[794px] min-h-[1123px] bg-white shadow-md rounded-sm p-12 cursor-text flex flex-col gap-6"
                    onClick={() => editor?.commands.focus()}
                    style={{
                      backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1099px, #f3f4f6 1099px, #f3f4f6 1123px)'
                    }}
                  >
                    {/* Inline Document Checklist */}
                    <div 
                      className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center justify-between text-sm text-slate-600 print:hidden" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                          <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500/20" checked={layoutLetterHead} onChange={(e) => setLayoutLetterHead(e.target.checked)} />
                          <span className="font-medium">Letterhead</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                          <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500/20" checked={layoutDate} onChange={(e) => setLayoutDate(e.target.checked)} />
                          <span className="font-medium">Date</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                          <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500/20" checked={layoutAddressee} onChange={(e) => setLayoutAddressee(e.target.checked)} />
                          <span className="font-medium">Addressee</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                          <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500/20" checked={layoutRemoveTopSpace} onChange={(e) => setLayoutRemoveTopSpace(e.target.checked)} />
                          <span className="font-medium">Remove Top Space</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <LayoutTemplate className="w-4 h-4" />
                        <span className="text-xs font-medium">Layout Overrides</span>
                      </div>
                    </div>

                    {/* Visual representation of Date (Not part of EditorContent) */}
                    {layoutDate && (
                      <div className="mb-5 font-sans">
                        <p className="m-0 text-slate-800">
                          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}

                    {/* Visual representation of Addressee (Not part of EditorContent) */}
                    {layoutAddressee && patient && (
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

                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
