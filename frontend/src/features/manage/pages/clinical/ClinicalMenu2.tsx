import React, { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useTemplates } from '@/features/clinical-template/hooks/useTemplates';
import { TemplateList } from '@/features/clinical-template/components/TemplateList';
import { TemplateFormModal } from '@/features/clinical-template/components/TemplateFormModal';
import type { ClinicalTemplate } from '@/types/clinicalTemplate';

export const ClinicalMenu2: React.FC = () => {
  const {
    templates,
    loading,
    saving,
    createTemplate,
    updateTemplate,
    archiveTemplate,
    createVersion,
  } = useTemplates();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClinicalTemplate | null>(null);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
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

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Clinical Note Templates</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Build and manage reusable documentation templates
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


      {/* Stats Bar */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-3 px-6 pb-4">
        {[
          {
            label: 'Total Templates',
            value: templates.length,
            color: 'text-gray-900',
            bg: 'bg-white',
            border: 'border-gray-200',
          },
          {
            label: 'Active',
            value: templates.filter((t) => t.is_active && !t.is_archived).length,
            color: 'text-green-700',
            bg: 'bg-green-50',
            border: 'border-green-200',
          },
          {
            label: 'Archived',
            value: templates.filter((t) => t.is_archived).length,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
          },
          {
            label: 'Categories',
            value: new Set(templates.map((t) => t.category)).size,
            color: 'text-sky-700',
            bg: 'bg-sky-50',
            border: 'border-sky-200',
          },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-hidden mx-6 mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <TemplateList
          templates={templates}
          loading={loading}
          onEdit={handleOpenEdit}
          onArchive={handleArchive}
          onCreateVersion={handleCreateVersion}
        />
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