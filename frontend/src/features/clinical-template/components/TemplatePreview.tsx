import React, { useState } from 'react';
import type { TemplateSection } from '@/types/clinicalTemplate';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { Eye, EyeOff } from 'lucide-react';

interface TemplatePreviewProps {
  sections: TemplateSection[];
  templateName?: string;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ sections, templateName }) => {
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [showPlaceholders, setShowPlaceholders] = useState(true);

  const handleChange = (fieldId: string, value: any) => {
    setPreviewValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const hasSections = sections.length > 0 && sections.some((s) => s.fields.length > 0);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Preview Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Live Preview</span>
          {templateName && (
            <span className="text-xs text-gray-400">— {templateName}</span>
          )}
        </div>
        <button
          onClick={() => setShowPlaceholders(!showPlaceholders)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {showPlaceholders ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPlaceholders ? 'Hide' : 'Show'} placeholders
        </button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasSections ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Eye className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-400">LIVE PREVIEW</p>
            <p className="text-sm text-gray-300 mt-1">
              Add sections and fields to see a preview
            </p>
          </div>
        ) : (
          <DynamicFormRenderer
            sections={sections}
            values={showPlaceholders ? previewValues : {}}
            onChange={handleChange}
            errors={{}}
            disabled={false}
          />
        )}
      </div>

      {/* Preview Footer */}
      {hasSections && (
        <div className="flex-shrink-0 px-4 py-2 bg-white border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            This is an interactive preview. Changes here are not saved.
          </p>
        </div>
      )}
    </div>
  );
};