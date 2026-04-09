import React, { useState, useEffect, useRef } from 'react';
import type { ClinicalTemplate, TemplateSection } from '@/types/clinicalTemplate';
import { X, Save, Loader2, ChevronDown, Plus, MapPin } from 'lucide-react';
import { TemplateBuilder } from './TemplateBuilder';
import { TemplatePreview } from './TemplatePreview';
import { DISCIPLINE_OPTIONS } from '@/features/setup/types/staff.types';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';

interface TemplateFormModalProps {
  isOpen: boolean;
  template?: ClinicalTemplate | null;
  onClose: () => void;
  onSave: (data: Partial<ClinicalTemplate>) => Promise<void>;
  saving?: boolean;
}

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
  saving = false,
}) => {
  const isEditing = !!template;

  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [clinicBranch, setClinicBranch] = useState<number | null>(null);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Clinic branches
  const { branches } = useClinicBranches();

  // Discipline dropdown state
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [disciplineSearch, setDisciplineSearch] = useState('');
  const [customDisciplines, setCustomDisciplines] = useState<string[]>([]);
  const disciplineRef = useRef<HTMLDivElement>(null);

  // All available disciplines = predefined + custom
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (disciplineRef.current && !disciplineRef.current.contains(e.target as Node)) {
        setDisciplineOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDiscipline(template.discipline || '');
      setClinicBranch(template.clinic_branch ?? null);
      setSections(template.structure?.sections || []);
    } else {
      setName('');
      setDiscipline('');
      setClinicBranch(null);
      setSections([]);
    }
    setDisciplineSearch('');
    setErrors({});
  }, [template, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Template name is required';
    if (!discipline.trim()) newErrors.discipline = 'Discipline is required';
    const totalFields = sections.reduce((acc, s) => acc + s.fields.length, 0);
    if (totalFields === 0) newErrors.sections = 'At least one field is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    await onSave({
      name: name.trim(),
      description: '',
      category: 'CUSTOM',
      discipline: discipline.trim(),
      clinic_branch: clinicBranch,
      structure: {
        version: '1.0',
        sections,
      },
    });
    onClose();
  };

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
            <div ref={disciplineRef} className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Discipline *
              </label>
              <button
                type="button"
                onClick={() => setDisciplineOpen(!disciplineOpen)}
                className={`w-full text-sm border rounded-lg px-3 py-2 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white ${
                  errors.discipline ? 'border-red-400' : 'border-gray-200'
                }`}
              >
                <span className={discipline ? 'text-gray-900' : 'text-gray-400'}>
                  {discipline || 'Select or create a discipline'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {errors.discipline && <p className="text-xs text-red-500 mt-1">{errors.discipline}</p>}

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
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={clinicBranch ?? ''}
                  onChange={(e) => setClinicBranch(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white appearance-none"
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
              <p className="text-xs text-gray-400">Add and configure fields</p>
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