import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Loader2, Save, Plus } from 'lucide-react';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';

const AVAILABLE_VARIABLES = [
  { label: 'Patient First Name', value: '{{patient.first_name}}' },
  { label: 'Patient Last Name', value: '{{patient.last_name}}' },
  { label: 'Patient Full Name', value: '{{patient.full_name}}' },
  { label: 'Patient DOB', value: '{{patient.dob}}' },
  { label: 'Patient Email', value: '{{patient.email}}' },
  { label: 'Patient Phone', value: '{{patient.phone}}' },
  { label: 'Patient Address', value: '{{patient.address}}' },

  { label: 'Practitioner First Name', value: '{{practitioner.first_name}}' },
  { label: 'Practitioner Last Name', value: '{{practitioner.last_name}}' },
  { label: 'Practitioner Full Name', value: '{{practitioner.full_name}}' },
  { label: 'Practitioner Title', value: '{{practitioner.title}}' },

  { label: 'Clinic Name', value: '{{clinic.name}}' },
  { label: 'Clinic Address', value: '{{clinic.address}}' },
  { label: 'Clinic Phone', value: '{{clinic.phone}}' },
  { label: 'Clinic Email', value: '{{clinic.email}}' },

  { label: 'Appointment Date', value: '{{appointment.date}}' },
  { label: 'Appointment Time', value: '{{appointment.time}}' },
  { label: 'Appointment Type', value: '{{appointment.type}}' },

  { label: 'Case Name', value: '{{case.name}}' },
  { label: 'Case Number', value: '{{case.number}}' },
  { label: 'Case Start Date', value: '{{case.start_date}}' },

  { label: 'Current Date', value: '{{date.today}}' },
  { label: 'Current Time', value: '{{time.now}}' },
];

interface LetterTemplateFormModalProps {
  isOpen: boolean;
  template: LetterTemplate | null;
  onClose: () => void;
  onSave: (data: Partial<LetterTemplate>) => Promise<void>;
  saving: boolean;
}

export const LetterTemplateFormModal: React.FC<LetterTemplateFormModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
  saving,
}) => {
  const [formData, setFormData] = useState<Partial<LetterTemplate>>({
    name: '',
    description: '',
    category: 'GENERAL',
    header_html: '',
    content_html: '',
    footer_html: '',
    is_active: true,
  });

  const [categoryType, setCategoryType] = useState<string>('GENERAL');

  const PREDEFINED_CATEGORIES = ['GENERAL', 'REFERRAL', 'REPORT', 'MEDICAL_CERT'];

  const headerRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLTextAreaElement>(null);
  const [activeRef, setActiveRef] = useState<React.RefObject<HTMLTextAreaElement | null>>(bodyRef);

  const insertVariable = (variable: string) => {
    if (!activeRef.current) return;

    const textarea = activeRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + variable + text.substring(end);

    // Update formData based on which ref is active
    if (activeRef === headerRef) {
      setFormData(prev => ({ ...prev, header_html: newText }));
    } else if (activeRef === bodyRef) {
      setFormData(prev => ({ ...prev, content_html: newText }));
    } else if (activeRef === footerRef) {
      setFormData(prev => ({ ...prev, footer_html: newText }));
    }

    // Restore cursor position slightly after render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setFormData(template);
        if (template.category && !PREDEFINED_CATEGORIES.includes(template.category)) {
          setCategoryType('CUSTOM');
        } else {
          setCategoryType(template.category || 'GENERAL');
        }
      } else {
        setFormData({
          name: '',
          description: '',
          category: 'GENERAL',
          header_html: '',
          content_html: '',
          footer_html: '',
          is_active: true,
        });
        setCategoryType('GENERAL');
      }
    }
  }, [isOpen, template]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {template ? 'Edit Letter Template' : 'New Letter Template'}
              </h2>
              <p className="text-sm text-gray-500">Configure your letter template format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <form id="letter-template-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  required
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="e.g. Referral Letter"
                />
              </div>


              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="Internal description of the template"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="flex gap-2">
                  <select
                    value={categoryType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategoryType(val);
                      if (val !== 'CUSTOM') {
                        setFormData(prev => ({ ...prev, category: val }));
                      } else {
                        setFormData(prev => ({ ...prev, category: '' }));
                      }
                    }}
                    className={`px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 ${categoryType === 'CUSTOM' ? 'w-1/2' : 'w-full'}`}
                  >
                    <option value="GENERAL">General Letter</option>
                    <option value="REFERRAL">Referral Letter</option>
                    <option value="REPORT">Clinical Report</option>
                    <option value="MEDICAL_CERT">Medical Certificate</option>
                    <option value="CUSTOM">Custom</option>
                  </select>

                  {categoryType === 'CUSTOM' && (
                    <input
                      type="text"
                      required
                      placeholder="Custom Category Name"
                      value={formData.category || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-1/2 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  )}
                </div>
              </div>

              {/* Insert Variables Toolbar */}
              <div className="col-span-2 mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Insert Dynamic Fields
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map(variable => (
                    <button
                      key={variable.value}
                      type="button"
                      onClick={() => insertVariable(variable.value)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-medium transition-colors"
                      title={variable.value}
                    >
                      <Plus className="w-3 h-3" />
                      {variable.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Click a field to insert it at your cursor position in the active text area.
                </p>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                  <span>Header</span>
                </label>
                <textarea
                  ref={headerRef}
                  onFocus={() => setActiveRef(headerRef)}
                  rows={4}
                  value={formData.header_html || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, header_html: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm whitespace-pre-wrap"
                  placeholder="e.g. Clinic Address, Logo, Date..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                  <span>Letter Body *</span>
                </label>
                <textarea
                  ref={bodyRef}
                  onFocus={() => setActiveRef(bodyRef)}
                  required
                  rows={12}
                  value={formData.content_html || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_html: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm whitespace-pre-wrap"
                  placeholder="Write your letter here..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                  <span>Footer</span>
                </label>
                <textarea
                  ref={footerRef}
                  onFocus={() => setActiveRef(footerRef)}
                  rows={4}
                  value={formData.footer_html || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, footer_html: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm whitespace-pre-wrap"
                  placeholder="e.g. Regards, Practitioner Name, Generated by MALASAKIT..."
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-2xl shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-600"
            />
            <span className="text-sm font-medium text-gray-700">Template is Active</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="letter-template-form"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
