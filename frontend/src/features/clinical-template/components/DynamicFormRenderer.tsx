import React from 'react';
import type { TemplateSection, TemplateField, ChartType } from '@/types/clinicalTemplate';
import {
  TextInput,
  TextArea,
  NumberInput,
  DateInput,
  SelectInput,
  CheckboxInput,
  CheckboxGroup,
  RadioGroup,
  PainScaleInput,
  RichTextEditor,
  TagsInput,
} from '../field-components';

interface DynamicFormRendererProps {
  sections: TemplateSection[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  sections,
  values,
  onChange,
  errors = {},
  disabled = false,
}) => {
  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {sortedSections.map((section) => (
        <div key={section.id}>
          {/* Section Header */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700">{section.title}</h3>
            {section.description && (
              <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
            )}
          </div>

          {/* Section Fields */}
          <div className="space-y-4">
            {section.fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={(value) => onChange(field.id, value)}
                error={errors[field.id]}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface FieldRendererProps {
  field: TemplateField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const commonProps = {
    label: field.label,
    value: value || field.defaultValue || '',
    onChange,
    error,
    required: field.required,
    disabled,
    placeholder: field.placeholder,
  };

  switch (field.type) {
    case 'section_header':
      return null; // Section headers rendered at section level

    case 'heading':
      return (
        <div className="pt-2">
          <h4 className="text-base font-semibold text-gray-800">{field.label}</h4>
          {field.helpText && <p className="text-xs text-gray-500 mt-0.5">{field.helpText}</p>}
        </div>
      );

    case 'text':
      return <TextInput {...commonProps} />;

    case 'textarea':
      return <TextArea {...commonProps} rows={field.rows || 4} />;

    case 'number':
      return <NumberInput {...commonProps} min={field.min} max={field.max} />;

    case 'date':
      return <DateInput {...commonProps} />;

    case 'datetime':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {field.helpText && <p className="text-xs text-gray-400 mt-1 italic">{field.helpText}</p>}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );

    case 'select':
      return <SelectInput {...commonProps} options={field.options || []} />;

    case 'checkbox':
      return <CheckboxInput {...commonProps} />;

    case 'checkbox_group':
      return <CheckboxGroup {...commonProps} options={field.options || []} />;

    case 'radio':
      return <RadioGroup {...commonProps} options={field.options || []} />;

    case 'scale':
      return <PainScaleInput {...commonProps} min={field.min || 0} max={field.max || 10} />;

    case 'chart':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className={`border-2 border-dashed border-gray-200 rounded-lg p-8 text-center ${field.mirrored ? 'grid grid-cols-2 gap-4' : ''}`}>
            {field.mirrored ? (
              <>
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <p className="text-sm text-gray-400">
                    {field.chartType === 'spine' ? 'Spine Chart' : field.chartType === 'head' ? 'Head Chart' : 'Body Chart'} — Left / Front
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <p className="text-sm text-gray-400">
                    {field.chartType === 'spine' ? 'Spine Chart' : field.chartType === 'head' ? 'Head Chart' : 'Body Chart'} — Right / Back
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                {field.chartType === 'spine' ? 'Spine Chart' : field.chartType === 'head' ? 'Head Chart' : 'Body Chart'}
              </p>
            )}
          </div>
          {field.helpText && <p className="text-xs text-gray-400 mt-1 italic">{field.helpText}</p>}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );

    case 'rich_text':
      return <RichTextEditor {...commonProps} />;

    case 'tags':
      return <TagsInput {...commonProps} />;

    default:
      return <div className="text-red-500">Unsupported field type: {field.type}</div>;
  }
};