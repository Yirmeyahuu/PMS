import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { ArrowLeft, Loader2, Save, MapPin, ChevronDown, Plus, LayoutTemplate } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';
import { MergeField } from './MergeField';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { DISCIPLINE_OPTIONS } from '@/features/setup/types/staff.types';

interface LetterTemplateEditorProps {
  template: LetterTemplate | null;
  onSave: (data: Partial<LetterTemplate>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

const LayoutToggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (c: boolean) => void }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <span className="text-xs font-semibold text-gray-600 tracking-wider group-hover:text-gray-900 transition-colors">{label}</span>
    <div 
      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? 'bg-sky-500' : 'bg-gray-300'}`}
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

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


  const { branches } = useClinicBranches();
  
  // Discipline dropdown state
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [disciplineSearch, setDisciplineSearch] = useState('');
  const [customDisciplines, setCustomDisciplines] = useState<string[]>([]);
  const disciplineRef = useRef<HTMLDivElement>(null);

  const allDisciplines = [
    ...DISCIPLINE_OPTIONS.map((d) => d.label),
    ...customDisciplines,
  ];

  const filteredDisciplines = allDisciplines.filter((d) =>
    d.toLowerCase().includes(disciplineSearch.toLowerCase())
  );

  const canCreateNew =
    disciplineSearch.trim().length > 0 &&
    !allDisciplines.some((d) => d.toLowerCase() === disciplineSearch.trim().toLowerCase());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (disciplineRef.current && !disciplineRef.current.contains(e.target as Node)) {
        setDisciplineOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDiscipline = (d: string) => {
    setDiscipline(d);
    setDisciplineSearch('');
    setDisciplineOpen(false);
  };

  const handleCreateDiscipline = () => {
    const newName = disciplineSearch.trim();
    if (newName && canCreateNew) {
      setCustomDisciplines((prev) => [...prev, newName]);
      setDiscipline(newName);
      setDisciplineSearch('');
      setDisciplineOpen(false);
    }
  };

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

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Template Name is required');
      return;
    }
    
    await onSave({
      name: name.trim(),
      description: template?.description || '', // Keeping it empty/unchanged
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

  const currentEditor = bodyEditor;

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Top Metadata Bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cancel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {template ? 'Edit Letter Template' : 'New Letter Template'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer mr-4">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-600"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Template
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 relative z-30">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Enter Letter Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="e.g. Referral Letter"
            />
          </div>

          <div ref={disciplineRef} className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Select Discipline
            </label>
            <button
              type="button"
              onClick={() => setDisciplineOpen(!disciplineOpen)}
              className="w-full text-sm border rounded-lg px-3 py-2 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white border-gray-300"
            >
              <span className={discipline ? 'text-gray-900' : 'text-gray-400'}>
                {discipline || 'Select or create a discipline'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {disciplineOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 flex flex-col">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    value={disciplineSearch}
                    onChange={(e) => setDisciplineSearch(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Search or type a new discipline..."
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredDisciplines.map((d) => (
                    <button
                      key={d}
                      onClick={() => handleSelectDiscipline(d)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-sky-50 transition-colors ${
                        discipline === d ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  {filteredDisciplines.length === 0 && !canCreateNew && (
                    <p className="px-3 py-2 text-xs text-gray-400">No disciplines found</p>
                  )}
                </div>
                {canCreateNew && (
                  <button
                    onClick={handleCreateDiscipline}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-sky-600 hover:bg-sky-50 border-t border-gray-100 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create "{disciplineSearch.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Select Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                value={clinicBranch ?? ''}
                onChange={(e) => setClinicBranch(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-sm border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white appearance-none"
              >
                <option value="">All Locations</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 z-10 sticky top-0 shadow-sm bg-white border-b border-gray-200">
        <EditorToolbar editor={currentEditor} />
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Document Canvas */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-100">
          <div className={`w-[800px] bg-white rounded shadow-md border border-gray-200 flex flex-col mb-16 relative group ${layoutRemoveTopSpace ? 'pt-0' : 'pt-12'}`}>
            
            {layoutLetterHead && (
              <div className="mx-8 mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 select-none">
                <LayoutTemplate className="w-5 h-5 mr-2 text-gray-300" />
                <span className="font-medium tracking-wide">CLINIC LETTER HEAD</span>
              </div>
            )}



            {layoutDate && (
              <div className="mx-8 mb-4 p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm w-48 select-none">
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}

            {layoutAddressee && (
              <div className="mx-8 mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm w-72 select-none flex flex-col gap-1">
                <div className="text-gray-500 font-medium">[Patient Full Name]</div>
                <div>[Patient Address Line 1]</div>
                <div>[Patient Suburb, State, Postcode]</div>
              </div>
            )}

            {/* Body Region */}
            <div 
              className="mx-8 mb-8 px-6 py-6 min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-colors cursor-text"
              onClick={() => bodyEditor?.commands.focus()}
            >
              <EditorContent editor={bodyEditor} />
            </div>
          </div>
        </div>

        {/* Right Layout Panel */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
          <div className="p-5 border-b border-gray-100 bg-gray-50/80 backdrop-blur">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2 uppercase tracking-wide">
              <LayoutTemplate className="w-4 h-4 text-sky-600" />
              Document Layout
            </h3>
            <p className="text-xs text-gray-500 mt-1">Configure standard elements</p>
          </div>
          <div className="p-5 flex flex-col gap-5">
            <LayoutToggle label="LETTER HEAD" checked={layoutLetterHead} onChange={setLayoutLetterHead} />
            <div className="h-px bg-gray-100 w-full" />
            <LayoutToggle label="REMOVE TOP SPACE" checked={layoutRemoveTopSpace} onChange={setLayoutRemoveTopSpace} />
            <div className="h-px bg-gray-100 w-full" />
            <LayoutToggle label="DATE" checked={layoutDate} onChange={setLayoutDate} />
            <div className="h-px bg-gray-100 w-full" />
            <LayoutToggle label="ADDRESSEE" checked={layoutAddressee} onChange={setLayoutAddressee} />
          </div>
          <div className="mt-auto p-5 bg-sky-50/50 text-xs text-sky-700 leading-relaxed border-t border-sky-100">
            <strong>Tip:</strong> Checked elements will be automatically injected into the final generated letter PDF.
          </div>
        </div>
      </div>
    </div>
  );
};
