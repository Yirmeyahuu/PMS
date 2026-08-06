import { useState, useEffect } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateLetter, previewLetter } from '../api/letters.api';
import { getActiveLetterTemplates, type LetterTemplate } from '../api/letterTemplates.api';


interface GenerateLetterModalProps {
  patientId: string | number;
  preSelectedTemplateId?: number;
  preSelectedCaseId?: number;
  appointmentId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const GenerateLetterModal = ({ 
  patientId, 
  preSelectedTemplateId,
  preSelectedCaseId,
  appointmentId,
  onClose, 
  onSuccess 
}: GenerateLetterModalProps) => {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<number | ''>(preSelectedTemplateId || '');
  const [subject, setSubject] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [patientCaseId] = useState<number | ''>(preSelectedCaseId || '');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch preview when template is selected
  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedTemplate) {
        setContentHtml('');
        return;
      }
      try {
        setIsPreviewLoading(true);
        const data = await previewLetter({
          template_id: Number(selectedTemplate),
          patient_id: patientId,
          patient_case_id: patientCaseId ? Number(patientCaseId) : undefined,
          appointment_id: appointmentId,
        });
        setContentHtml(data.content_html);
      } catch (err) {
        console.error('Failed to preview letter', err);
        toast.error('Failed to load letter preview');
      } finally {
        setIsPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [selectedTemplate, patientId, patientCaseId, appointmentId]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getActiveLetterTemplates();
        setTemplates(data);
        if (preSelectedTemplateId) {
          const t = data.find(t => t.id === preSelectedTemplateId);
          if (t) setSubject(t.name);
        }
      } catch (error) {
        toast.error('Failed to load letter templates');
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    if (!subject) {
      toast.error('Please enter a subject');
      return;
    }

    try {
      setIsGenerating(true);
      await generateLetter({
        template_id: Number(selectedTemplate),
        patient_id: patientId,
        subject,
        patient_case_id: patientCaseId ? Number(patientCaseId) : undefined,
        appointment_id: appointmentId,
        content_html: contentHtml,
      });
      toast.success('Letter generated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate letter');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Generate Letter</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoadingTemplates ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Letter Template *</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setSelectedTemplate(val);
                    
                    // Auto-fill subject if not set
                    if (val) {
                      const template = templates.find(t => t.id === val);
                      if (template) {
                        setSubject(template.name);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="w-2/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Title *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Medical Certificate"
                  required
                />
              </div>
            </div>

            {selectedTemplate && (
              <div className="flex-1 flex flex-col min-h-[300px] mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Letter Content *</label>
                {isPreviewLoading ? (
                  <div className="flex-1 flex justify-center items-center bg-slate-50 border border-slate-200 rounded-xl">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                ) : (
                  <textarea
                    required
                    value={contentHtml}
                    onChange={(e) => setContentHtml(e.target.value)}
                    className="flex-1 w-full p-4 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none whitespace-pre-wrap font-mono text-sm"
                  />
                )}
              </div>
            )}



            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !selectedTemplate || !subject}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Letter'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
