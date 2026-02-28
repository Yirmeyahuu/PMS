import React from 'react';
import type { TemplateSection, TemplateField } from '@/types/clinicalTemplate';
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
    <div className="space-y-8">
      {sortedSections.map((section) => (
        <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Section Header */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-gray-600 mt-1">{section.description}</p>
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
    case 'text':
      return <TextInput {...commonProps} />;

    case 'textarea':
      return <TextArea {...commonProps} rows={field.rows || 4} />;

    case 'number':
      return <NumberInput {...commonProps} min={field.min} max={field.max} />;

    case 'date':
      return <DateInput {...commonProps} />;

    case 'select':
      return <SelectInput {...commonProps} options={field.options || []} />;

    case 'checkbox':
      return <CheckboxInput {...commonProps} />;

    case 'checkbox_group':
      return <CheckboxGroup {...commonProps} options={field.options || []} />;

    case 'radio':
      return <RadioGroup {...commonProps} options={field.options || []} />;

    case 'pain_scale':
      return <PainScaleInput {...commonProps} min={field.min || 0} max={field.max || 10} />;

    case 'rich_text':
      return <RichTextEditor {...commonProps} />;

    case 'tags':
      return <TagsInput {...commonProps} />;

    case 'nested_group':
      return (
        <div className="border-l-4 border-sky-300 pl-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-3">
            {field.fields?.map((nestedField) => (
              <FieldRenderer
                key={nestedField.id}
                field={nestedField}
                value={value?.[nestedField.id]}
                onChange={(nestedValue) =>
                  onChange({
                    ...value,
                    [nestedField.id]: nestedValue,
                  })
                }
                error={error}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      );

    default:
      return <div className="text-red-500">Unsupported field type: {field.type}</div>;
  }
};