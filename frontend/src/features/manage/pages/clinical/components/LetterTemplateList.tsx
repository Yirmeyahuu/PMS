import React, { useState, useMemo } from 'react';
import { Archive, Edit2, FileText, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';

interface LetterTemplateListProps {
  templates: LetterTemplate[];
  loading: boolean;
  onEdit: (template: LetterTemplate) => void;
  onArchive: (template: LetterTemplate) => void;
  onDuplicate?: (template: LetterTemplate) => void;
}

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <>{text}</>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export const LetterTemplateList: React.FC<LetterTemplateListProps> = ({
  templates,
  loading,
  onEdit,
  onArchive,
  onDuplicate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract unique disciplines and locations for filters
  const uniqueDisciplines = useMemo(() => {
    const disciplines = templates.map((t) => t.discipline).filter(Boolean) as string[];
    return Array.from(new Set(disciplines)).sort();
  }, [templates]);

  const uniqueLocations = useMemo(() => {
    const locations = templates.map((t) => t.clinic_branch_name || (t.clinic_branch ? `Branch #${t.clinic_branch}` : '')).filter(Boolean) as string[];
    return Array.from(new Set(locations)).sort();
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const templateDiscipline = template.discipline || '';
      const matchesDiscipline = disciplineFilter ? templateDiscipline === disciplineFilter : true;
      
      const templateLocation = template.clinic_branch_name || (template.clinic_branch ? `Branch #${template.clinic_branch}` : '');
      const matchesLocation = locationFilter ? templateLocation === locationFilter : true;
      
      return matchesSearch && matchesDiscipline && matchesLocation;
    });
  }, [templates, searchQuery, disciplineFilter, locationFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTemplates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTemplates, currentPage]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, disciplineFilter, locationFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Loading templates...
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-500">
        <FileText className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-lg font-medium text-gray-600">No Letter Templates</p>
        <p className="text-sm">Create your first letter template to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-200 bg-white shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
            >
              <option value="">All Disciplines</option>
              {uniqueDisciplines.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-sm font-semibold text-gray-900 whitespace-nowrap">Discipline</th>
              <th className="px-4 py-2.5 text-sm font-semibold text-gray-900 whitespace-nowrap">Name</th>
              <th className="px-4 py-2.5 text-sm font-semibold text-gray-900 whitespace-nowrap">Location</th>
              <th className="px-4 py-2.5 text-sm font-semibold text-gray-900 whitespace-nowrap">Last Modified</th>
              <th className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedTemplates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No templates match your search or filters.
                </td>
              </tr>
            ) : (
              paginatedTemplates.map((template) => (
            <tr key={template.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-2.5">
                <span className="text-sm text-gray-700">
                  {template.discipline || '-'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <div>
                  <p className="font-medium text-gray-900">
                    <HighlightText text={template.name} highlight={searchQuery} />
                  </p>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                      <HighlightText text={template.description} highlight={searchQuery} />
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-sm text-gray-700">
                  {template.clinic_branch_name || (template.clinic_branch ? `Branch #${template.clinic_branch}` : 'All Locations')}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-sm text-gray-700">
                  {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : '-'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(template)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {onDuplicate && (
                    <button
                      onClick={() => onDuplicate(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                  )}
                  {template.is_active && (
                    <button
                      onClick={() => onArchive(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )))}
        </tbody>
      </table>
      </div>
      
      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white shrink-0">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredTemplates.length)}</span> of{' '}
            <span className="font-medium text-gray-900">{filteredTemplates.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
