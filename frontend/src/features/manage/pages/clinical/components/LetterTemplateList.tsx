import React from 'react';
import { Archive, Edit2, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';

interface LetterTemplateListProps {
  templates: LetterTemplate[];
  loading: boolean;
  onEdit: (template: LetterTemplate) => void;
  onArchive: (template: LetterTemplate) => void;
}

export const LetterTemplateList: React.FC<LetterTemplateListProps> = ({
  templates,
  loading,
  onEdit,
  onArchive,
}) => {
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
    <div className="overflow-x-auto h-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-sm font-semibold text-gray-900">Name</th>
            <th className="px-4 py-2.5 text-sm font-semibold text-gray-900">Category</th>
            <th className="px-4 py-2.5 text-sm font-semibold text-gray-900">Status</th>
            <th className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {templates.map((template) => (
            <tr key={template.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-2.5">
                <div>
                  <p className="font-medium text-gray-900">{template.name}</p>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {template.category || 'Uncategorized'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {template.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="w-3.5 h-3.5" />
                    Archived
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => onEdit(template)}
                    className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                    title="Edit Template"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {template.is_active && (
                    <button
                      onClick={() => onArchive(template)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Archive Template"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
