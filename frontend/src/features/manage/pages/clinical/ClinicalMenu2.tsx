import React, { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useTemplates } from '@/features/clinical-template/hooks/useTemplates';
import { TemplateList } from '@/features/clinical-template/components/TemplateList';
import { TemplateFormModal } from '@/features/clinical-template/components/TemplateFormModal';
import { LetterTemplateList } from '@/features/manage/pages/clinical/components/LetterTemplateList';
import { LetterTemplateEditor } from '@/features/manage/pages/clinical/components/editor/LetterTemplateEditor';
import { useLetterTemplates } from '@/features/manage/pages/clinical/hooks/useLetterTemplates';
import type { ClinicalTemplate } from '@/types/clinicalTemplate';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';

export const ClinicalMenu2: React.FC<{ initialTab?: 'notes' | 'letters' }> = ({ initialTab = 'notes' }) => {
  const {
    templates,
    loading,
    saving,
    createTemplate,
    updateTemplate,
    archiveTemplate,
    createVersion,
  } = useTemplates();

  const {
    templates: letterTemplates,
    loading: letterLoading,
    saving: letterSaving,
    createTemplate: createLetterTemplate,
    updateTemplate: updateLetterTemplate,
    archiveTemplate: archiveLetterTemplate,
  } = useLetterTemplates();

  const [activeTab] = useState<'notes' | 'letters'>(initialTab);
  const [editorMode, setEditorMode] = useState<'list' | 'create' | 'edit'>('list');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClinicalTemplate | null>(null);

  const [editingLetterTemplate, setEditingLetterTemplate] = useState<LetterTemplate | null>(null);

  const handleOpenCreate = () => {
    if (activeTab === 'notes') {
      setEditingTemplate(null);
      setModalOpen(true);
    } else {
      setEditingLetterTemplate(null);
      setEditorMode('create');
    }
  };

  const handleOpenEdit = (template: ClinicalTemplate) => {
    setEditingTemplate(template);
    setModalOpen(true);
  };

  const handleSave = async (data: Partial<ClinicalTemplate>) => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, data);
    } else {
      await createTemplate(data);
    }
  };

  const handleArchive = async (template: ClinicalTemplate) => {
    if (window.confirm(`Archive "${template.name}"? It will no longer be available for new notes.`)) {
      await archiveTemplate(template.id);
    }
  };

  const handleEditLetter = (template: LetterTemplate) => {
    setEditingLetterTemplate(template);
    setEditorMode('edit');
  };

  const handleSaveLetter = async (data: Partial<LetterTemplate>) => {
    if (editingLetterTemplate) {
      await updateLetterTemplate(editingLetterTemplate.id, data);
    } else {
      await createLetterTemplate(data);
    }
    setEditorMode('list');
  };

  const handleArchiveLetter = async (template: LetterTemplate) => {
    if (window.confirm(`Archive Letter Template "${template.name}"?`)) {
      await archiveLetterTemplate(template.id);
    }
  };

  const handleCreateVersion = async (template: ClinicalTemplate) => {
    if (
      window.confirm(
        `Create a new version of "${template.name}"? The current version will be deactivated.`
      )
    ) {
      const newVersion = await createVersion(template.id);
      if (newVersion) {
        setEditingTemplate(newVersion);
        setModalOpen(true);
      }
    }
  };

  if (editorMode !== 'list') {
    return (
      <LetterTemplateEditor
        template={editingLetterTemplate}
        onSave={handleSaveLetter}
        onCancel={() => setEditorMode('list')}
        saving={letterSaving}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === 'notes' ? 'Clinical Note Templates' : 'Clinical Letter Templates'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeTab === 'notes'
                ? 'Build and manage reusable documentation templates'
                : 'Build and manage reusable letter templates'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>


      {/* Template List */}
      <div className="flex-1 overflow-hidden mx-6 mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
        {activeTab === 'notes' ? (
          <TemplateList
            templates={templates}
            loading={loading}
            onEdit={handleOpenEdit}
            onArchive={handleArchive}
            onCreateVersion={handleCreateVersion}
          />
        ) : (
          <LetterTemplateList
            templates={letterTemplates}
            loading={letterLoading}
            onEdit={handleEditLetter}
            onArchive={handleArchiveLetter}
          />
        )}
      </div>

      {/* Template Form Modal */}
      <TemplateFormModal
        isOpen={modalOpen}
        template={editingTemplate}
        onClose={() => {
          setModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}; 