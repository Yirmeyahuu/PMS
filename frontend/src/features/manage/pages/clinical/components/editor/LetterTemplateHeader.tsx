import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, Save, MapPin, ChevronDown, Plus } from 'lucide-react';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { DISCIPLINE_OPTIONS } from '@/features/setup/types/staff.types';

interface LetterTemplateHeaderProps {
  template: LetterTemplate | null;
  name: string;
  setName: (name: string) => void;
  discipline: string;
  setDiscipline: (d: string) => void;
  clinicBranch: number | null;
  setClinicBranch: (b: number | null) => void;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const LetterTemplateHeader: React.FC<LetterTemplateHeaderProps> = ({
  template,
  name,
  setName,
  discipline,
  setDiscipline,
  clinicBranch,
  setClinicBranch,
  isActive,
  setIsActive,
  saving,
  onSave,
  onCancel,
}) => {
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

  return (
    <div className="shrink-0 flex flex-col z-20 shadow-sm relative">
      {/* Top Metadata Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
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
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Template
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 relative z-30">
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
    </div>
  );
};
