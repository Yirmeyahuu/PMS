import React, { useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';
import { MergeField } from './MergeField';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';

import { LetterTemplateHeader } from './LetterTemplateHeader';
import { LetterDocumentEditor } from './LetterDocumentEditor';
import { LetterDocumentLayoutPanel } from './LetterDocumentLayoutPanel';

interface LetterTemplateEditorProps {
  template: LetterTemplate | null;
  onSave: (data: Partial<LetterTemplate>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export const LetterTemplateEditor: React.FC<LetterTemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  saving,
}) => {
  const [name, setName] = useState(template?.name || '');
  const [discipline, setDiscipline] = useState(template?.discipline || '');
  const [clinicBranch, setClinicBranch] = useState<number | null>(template?.clinic_branch ?? null);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);

  // Layout Controls
  const [layoutLetterHead, setLayoutLetterHead] = useState(template?.layout_letter_head ?? true);
  const [layoutRemoveTopSpace, setLayoutRemoveTopSpace] = useState(template?.layout_remove_top_space ?? false);
  const [layoutDate, setLayoutDate] = useState(template?.layout_date ?? true);
  const [layoutAddressee, setLayoutAddressee] = useState(template?.layout_addressee ?? true);

  const editorConfig = {
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: true, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      Underline,
      MergeField,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px]',
      },
    },
  };

  const bodyEditor = useEditor({
    ...editorConfig,
    content: template?.content_html || '',
    extensions: [...editorConfig.extensions, Placeholder.configure({ placeholder: 'Write your letter body here...' })],
  });

  React.useEffect(() => {
    // Removed PaginationPlus updatePageSize
  }, [bodyEditor]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Template Name is required');
      return;
    }
    
    await onSave({
      name: name.trim(),
      description: template?.description || '',
      category: template?.category || 'GENERAL',
      discipline: discipline.trim(),
      clinic_branch: clinicBranch,
      layout_letter_head: layoutLetterHead,
      layout_remove_top_space: layoutRemoveTopSpace,
      layout_date: layoutDate,
      layout_addressee: layoutAddressee,
      is_active: isActive,
      header_html: '',
      content_html: bodyEditor?.getHTML() || '',
      footer_html: '',
    });
  };

  const handleCancel = () => {
    const currentBody = bodyEditor?.getHTML() || '';
    const originalBody = template?.content_html || '<p></p>';

    if (currentBody !== originalBody || name !== (template?.name || '')) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    onCancel();
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-gray-100 min-h-0 overflow-hidden">
      
      {/* STICKY HEADER & TOOLBAR TO PREVENT SCROLL OFF */}
      <div className="sticky top-0 z-30 flex flex-col shadow-sm">
        {/* 1. FIXED HEADER */}
        <LetterTemplateHeader
          template={template}
          name={name}
          setName={setName}
          discipline={discipline}
          setDiscipline={setDiscipline}
          clinicBranch={clinicBranch}
          setClinicBranch={setClinicBranch}
          isActive={isActive}
          setIsActive={setIsActive}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
        />

        {/* 2. FIXED TOOLBAR */}
        <div className="bg-white border-b border-gray-200">
          <EditorToolbar editor={bodyEditor} />
        </div>
      </div>

      {/* 3. WORKSPACE (Document & Panel) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* ONLY THIS REGION SCROLLS */}
        <LetterDocumentEditor
          bodyEditor={bodyEditor}
          layoutLetterHead={layoutLetterHead}
          layoutRemoveTopSpace={layoutRemoveTopSpace}
          layoutDate={layoutDate}
          layoutAddressee={layoutAddressee}
        />

        {/* FIXED RIGHT PANEL */}
        <LetterDocumentLayoutPanel
          layoutLetterHead={layoutLetterHead}
          setLayoutLetterHead={setLayoutLetterHead}
          layoutRemoveTopSpace={layoutRemoveTopSpace}
          setLayoutRemoveTopSpace={setLayoutRemoveTopSpace}
          layoutDate={layoutDate}
          setLayoutDate={setLayoutDate}
          layoutAddressee={layoutAddressee}
          setLayoutAddressee={setLayoutAddressee}
        />
        
      </div>
    </div>
  );
};
