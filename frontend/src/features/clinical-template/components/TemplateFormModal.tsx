import React, { useState, useEffect } from 'react';
import type { ClinicalTemplate, TemplateSection } from '@/types/clinicalTemplate';
import { X, Save, Loader2 } from 'lucide-react';
import { TemplateBuilder } from './TemplateBuilder';
import { TemplatePreview } from './TemplatePreview';

interface TemplateFormModalProps {
  isOpen: boolean;
  template?: ClinicalTemplate | null;
  onClose: () => void;
  onSave: (data: Partial<ClinicalTemplate>) => Promise<void>;
  saving?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'INITIAL', label: 'Initial Assessment' },
  { value: 'FOLLOW_UP', label: 'Follow-up Note' },
  { value: 'PROGRESS', label: 'Progress Note' },
  { value: 'DISCHARGE', label: 'Discharge Summary' },
  { value: 'SOAP', label: 'SOAP Note' },
  { value: 'CUSTOM', label: 'Custom Template' },
];

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
  saving = false,
}) => {
  const isEditing = !!template;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ClinicalTemplate['category']>('SOAP');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setCategory(template.category);
      setSections(template.structure?.sections || []);
    } else {
      setName('');
      setDescription('');
      setCategory('SOAP');
      setSections([]);
    }
    setErrors({});
  }, [template, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Template name is required';
    if (!category) newErrors.category = 'Category is required';
    if (sections.length === 0) newErrors.sections = 'At least one section is required';
    const hasEmptySection = sections.some((s) => !s.title.trim());
    if (hasEmptySection) newErrors.sections = 'All sections must have a title';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    await onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      structure: {
        version: '1.0',
        sections,
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] max-w-7xl flex flex-col">
        {/* Modal Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? `Edit Template: ${template.name}` : 'Create New Template'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? `v${template.version} • ${template.category}`
                : 'Build a reusable clinical note template'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Metadata */}
        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  errors.name ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="e.g. SOAP Note - Physiotherapy"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClinicalTemplate['category'])}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white ${
                  errors.category ? 'border-red-400' : 'border-gray-200'
                }`}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Optional description"
              />
            </div>
          </div>
          {errors.sections && (
            <p className="text-xs text-red-500 mt-2">⚠ {errors.sections}</p>
          )}
        </div>

        {/* Builder + Preview Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Builder */}
          <div className="w-1/2 flex flex-col border-r border-gray-200 overflow-hidden">
            <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Form Builder</h3>
              <p className="text-xs text-gray-400">Add and configure sections and fields</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <TemplateBuilder sections={sections} onChange={setSections} />
            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
              <p className="text-xs text-gray-400">See how the form will look to practitioners</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <TemplatePreview sections={sections} templateName={name} />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-400">
            {sections.length} section{sections.length !== 1 ? 's' : ''} •{' '}
            {sections.reduce((acc, s) => acc + s.fields.length, 0)} field
            {sections.reduce((acc, s) => acc + s.fields.length, 0) !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};