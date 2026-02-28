import React, { useState } from 'react';
import type { TemplateSection, TemplateField, FieldType } from '@/types/clinicalTemplate';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Type,
  AlignLeft,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Radio,
  Activity,
  FileText,
  Tag,
  Layers,
} from 'lucide-react';

interface TemplateBuilderProps {
  sections: TemplateSection[];
  onChange: (sections: TemplateSection[]) => void;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
  { type: 'textarea', label: 'Text Area', icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { type: 'number', label: 'Number', icon: <Hash className="w-3.5 h-3.5" /> },
  { type: 'date', label: 'Date', icon: <Calendar className="w-3.5 h-3.5" /> },
  { type: 'select', label: 'Dropdown', icon: <List className="w-3.5 h-3.5" /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { type: 'checkbox_group', label: 'Checkbox Group', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { type: 'radio', label: 'Radio Group', icon: <Radio className="w-3.5 h-3.5" /> },
  { type: 'pain_scale', label: 'Pain Scale', icon: <Activity className="w-3.5 h-3.5" /> },
  { type: 'rich_text', label: 'Rich Text', icon: <FileText className="w-3.5 h-3.5" /> },
  { type: 'tags', label: 'Tags', icon: <Tag className="w-3.5 h-3.5" /> },
  { type: 'nested_group', label: 'Nested Group', icon: <Layers className="w-3.5 h-3.5" /> },
];

const generateId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const generateSectionId = () => `section_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

// ─── Field Editor ────────────────────────────────────────────────────────────
interface FieldEditorProps {
  field: TemplateField;
  onChange: (field: TemplateField) => void;
  onDelete: () => void;
  depth?: number;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onChange, onDelete, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);

  const updateField = (key: keyof TemplateField, value: any) => {
    onChange({ ...field, [key]: value });
  };

  const addOption = () => {
    const options = field.options || [];
    onChange({
      ...field,
      options: [...options, { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}` }],
    });
  };

  const updateOption = (index: number, key: 'value' | 'label', value: string) => {
    const options = [...(field.options || [])];
    options[index] = { ...options[index], [key]: value };
    onChange({ ...field, options });
  };

  const removeOption = (index: number) => {
    const options = [...(field.options || [])];
    options.splice(index, 1);
    onChange({ ...field, options });
  };

  const addNestedField = () => {
    const fields = field.fields || [];
    onChange({
      ...field,
      fields: [
        ...fields,
        { id: generateId(), type: 'text', label: 'New Field' },
      ],
    });
  };

  const updateNestedField = (index: number, updated: TemplateField) => {
    const fields = [...(field.fields || [])];
    fields[index] = updated;
    onChange({ ...field, fields });
  };

  const removeNestedField = (index: number) => {
    const fields = [...(field.fields || [])];
    fields.splice(index, 1);
    onChange({ ...field, fields });
  };

  const hasOptions = ['select', 'checkbox_group', 'radio'].includes(field.type);
  const hasMinMax = ['number', 'pain_scale'].includes(field.type);
  const hasRows = field.type === 'textarea';
  const isNested = field.type === 'nested_group';

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${depth > 0 ? 'ml-4' : ''}`}>
      {/* Field Header */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-t-lg">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab flex-shrink-0" />
        <button onClick={() => setExpanded(!expanded)} className="flex-1 flex items-center gap-2 text-left">
          <span className="text-xs font-medium text-gray-700 truncate">{field.label || 'Untitled Field'}</span>
          <span className="text-xs text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
            {field.type}
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Field Settings */}
      {expanded && (
        <div className="p-3 space-y-3">
          {/* Label & Type Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField('label', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Field label"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select
                value={field.type}
                onChange={(e) => updateField('type', e.target.value as FieldType)}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.type} value={ft.type}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Placeholder */}
          {!isNested && field.type !== 'checkbox' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField('placeholder', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Optional placeholder text"
              />
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`required_${field.id}`}
              checked={field.required || false}
              onChange={(e) => updateField('required', e.target.checked)}
              className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
            />
            <label htmlFor={`required_${field.id}`} className="text-xs font-medium text-gray-600">
              Required field
            </label>
          </div>

          {/* Min/Max */}
          {hasMinMax && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min</label>
                <input
                  type="number"
                  value={field.min ?? ''}
                  onChange={(e) => updateField('min', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max</label>
                <input
                  type="number"
                  value={field.max ?? ''}
                  onChange={(e) => updateField('max', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* Rows for textarea */}
          {hasRows && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rows</label>
              <input
                type="number"
                value={field.rows || 4}
                onChange={(e) => updateField('rows', Number(e.target.value))}
                min={1}
                max={20}
                className="w-24 text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}

          {/* Options */}
          {hasOptions && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">Options</label>
                <button
                  onClick={addOption}
                  className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Option
                </button>
              </div>
              <div className="space-y-1.5">
                {(field.options || []).map((opt, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={opt.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      className="w-1/3 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                      placeholder="value"
                    />
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      placeholder="Label"
                    />
                    <button
                      onClick={() => removeOption(index)}
                      className="text-red-400 hover:text-red-600 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(field.options || []).length === 0 && (
                  <p className="text-xs text-gray-400 italic">No options added yet</p>
                )}
              </div>
            </div>
          )}

          {/* Nested Fields */}
          {isNested && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">Nested Fields</label>
                <button
                  onClick={addNestedField}
                  className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Sub-field
                </button>
              </div>
              <div className="space-y-2">
                {(field.fields || []).map((nestedField, index) => (
                  <FieldEditor
                    key={nestedField.id}
                    field={nestedField}
                    onChange={(updated) => updateNestedField(index, updated)}
                    onDelete={() => removeNestedField(index)}
                    depth={depth + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Section Editor ──────────────────────────────────────────────────────────
interface SectionEditorProps {
  section: TemplateSection;
  onChange: (section: TemplateSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const addField = (type: FieldType = 'text') => {
    const newField: TemplateField = {
      id: generateId(),
      type,
      label: `New ${FIELD_TYPES.find((f) => f.type === type)?.label || 'Field'}`,
    };
    onChange({ ...section, fields: [...section.fields, newField] });
  };

  const updateField = (index: number, updated: TemplateField) => {
    const fields = [...section.fields];
    fields[index] = updated;
    onChange({ ...section, fields });
  };

  const deleteField = (index: number) => {
    const fields = [...section.fields];
    fields.splice(index, 1);
    onChange({ ...section, fields });
  };

  return (
    <div className="border-2 border-sky-100 rounded-xl bg-sky-50/30">
      {/* Section Header */}
      <div className="flex items-center gap-2 p-3 bg-sky-50 rounded-t-xl border-b border-sky-100">
        <GripVertical className="w-4 h-4 text-sky-400 cursor-grab" />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <span className="font-semibold text-sky-900 text-sm">
            {section.title || 'Untitled Section'}
          </span>
          <span className="text-xs text-sky-500">({section.fields.length} fields)</span>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-sky-400 ml-auto" />
          ) : (
            <ChevronUp className="w-4 h-4 text-sky-400 ml-auto" />
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-sky-400 hover:text-sky-600 disabled:opacity-30 hover:bg-sky-100 rounded"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-sky-400 hover:text-sky-600 disabled:opacity-30 hover:bg-sky-100 rounded"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* Section Title & Description */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section Title *</label>
              <input
                type="text"
                value={section.title}
                onChange={(e) => onChange({ ...section, title: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="e.g. Subjective"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={section.description || ''}
                onChange={(e) => onChange({ ...section, description: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-2">
            {section.fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                field={field}
                onChange={(updated) => updateField(index, updated)}
                onDelete={() => deleteField(index)}
              />
            ))}
          </div>

          {/* Add Field */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-500">Add field:</span>
            <div className="flex flex-wrap gap-1">
              {FIELD_TYPES.slice(0, 6).map((ft) => (
                <button
                  key={ft.type}
                  onClick={() => addField(ft.type)}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:border-sky-400 hover:text-sky-600 transition-colors"
                >
                  {ft.icon}
                  {ft.label}
                </button>
              ))}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addField(e.target.value as FieldType);
                    e.target.value = '';
                  }
                }}
                className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:border-sky-400 focus:outline-none cursor-pointer"
              >
                <option value="">More...</option>
                {FIELD_TYPES.slice(6).map((ft) => (
                  <option key={ft.type} value={ft.type}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main TemplateBuilder ────────────────────────────────────────────────────
export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ sections, onChange }) => {
  const addSection = () => {
    const newSection: TemplateSection = {
      id: generateSectionId(),
      title: `Section ${sections.length + 1}`,
      order: sections.length + 1,
      fields: [],
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (index: number, updated: TemplateSection) => {
    const updated_sections = [...sections];
    updated_sections[index] = updated;
    onChange(updated_sections);
  };

  const deleteSection = (index: number) => {
    const updated = [...sections];
    updated.splice(index, 1);
    // Re-order
    onChange(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const updated = [...sections];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    onChange(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mb-3">
              <Layers className="w-8 h-8 text-sky-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No sections yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Section" to start building</p>
          </div>
        )}
        {sections.map((section, index) => (
          <SectionEditor
            key={section.id}
            section={section}
            onChange={(updated) => updateSection(index, updated)}
            onDelete={() => deleteSection(index)}
            onMoveUp={() => moveSection(index, 'up')}
            onMoveDown={() => moveSection(index, 'down')}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
          />
        ))}
      </div>

      {/* Add Section Button */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <button
          onClick={addSection}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-sky-300 text-sky-600 rounded-xl hover:bg-sky-50 hover:border-sky-400 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </button>
      </div>
    </div>
  );
};