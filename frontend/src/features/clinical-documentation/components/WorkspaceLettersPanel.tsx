import { useState, useEffect } from 'react';
import { Search, Loader2, FileText, Plus, Navigation } from 'lucide-react';
import { getActiveLetterTemplates, type LetterTemplate } from '../api/letterTemplates.api';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileCheck } from 'lucide-react';
import { createConsentDocument } from '@/features/patients/patient.api';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';

export const WorkspaceLettersPanel = () => {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { setEditorContext, selectedCaseId, triggerRefresh } = useClinicalWorkspace();
  const navigate = useNavigate();
  const { patient } = usePatientProfileContext();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchTemplates = async () => {
      try {
        const data = await getActiveLetterTemplates();
        if (!cancelled) setTemplates(data);
      } catch (err) {
        console.error('Failed to fetch templates', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTemplates();
    return () => { cancelled = true; };
  }, []);

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(filteredTemplates.map(t => t.category).filter(Boolean)));

  const handleGenerateConsent = async (type: string, title: string) => {
    if (!patient || !selectedCaseId) {
      alert("Please select a case and ensure patient is loaded.");
      return;
    }
    
    // Simplistic manual generation prompt for signature
    const signature = prompt(`Please enter patient signature name to generate ${title}:`, patient.first_name + ' ' + patient.last_name);
    if (!signature) return;

    try {
      setIsGenerating(true);
      await createConsentDocument(patient.id, {
        title,
        header_snapshot: '',
        body_snapshot: `Manual generation of ${title} for ${patient.first_name} ${patient.last_name}`,
        signature,
        consent_version: 'v1.0 (Manual)',
        signer_full_name: signature,
        signer_email: patient.email || 'no-email@example.com',
        type,
        patient_case_id: selectedCaseId,
        // Optional appointment_id could be added if we tracked the active appointment
      });
      triggerRefresh();
      alert(`${title} generated successfully.`);
    } catch (err) {
      console.error('Failed to create consent document', err);
      alert("Failed to generate document.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading templates...</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">No Letter Templates Found</h3>
        <p className="text-xs text-slate-500 mb-4">You haven't created any letter templates yet.</p>
        <button
          onClick={() => navigate('/manage', { state: { activeCategory: 'clinical', activeItem: 'letter_templates' } })}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* System Forms (Consent) */}
        <div className="mb-6">
          <div className="flex items-center gap-3 px-2 mb-2">
            <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              SYSTEM FORMS
            </h4>
            <div className="h-px flex-1 bg-slate-200/60" />
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleGenerateConsent('DATA_PRIVACY_CONSENT', 'Data Privacy Form')}
              disabled={isGenerating}
              className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-indigo-50 group transition-colors disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-900 truncate">
                  Data Privacy Form
                </p>
                <p className="text-xs text-slate-500 truncate">Generate manual consent form</p>
              </div>
              <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
            </button>

            <button
              onClick={() => handleGenerateConsent('CLINIC_CONSENT', 'Clinic Consent Form')}
              disabled={isGenerating}
              className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-indigo-50 group transition-colors disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                <FileCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-900 truncate">
                  Clinic Consent Form
                </p>
                <p className="text-xs text-slate-500 truncate">Generate manual consent form</p>
              </div>
              <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-emerald-500 transition-all" />
            </button>
          </div>
        </div>

        {categories.length === 0 && searchTerm && (
          <div className="text-center py-10 text-slate-400 text-sm">
            No templates match your search.
          </div>
        )}
        
        {categories.map((category) => (
          <div key={category} className="mb-4 last:mb-0">
            <div className="flex items-center gap-3 px-2 mb-2">
              <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {category}
              </h4>
              <div className="h-px flex-1 bg-slate-200/60" />
            </div>
            <div className="space-y-1">
              {filteredTemplates
                .filter(t => t.category === category)
                .map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      if (!selectedCaseId) {
                        alert("Assign a Case first to create clinical documentation.");
                        return;
                      }
                      setEditorContext({ type: 'NEW_LETTER', templateId: template.id });
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-indigo-50 group transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-900 truncate">
                        {template.name}
                      </p>
                      {template.description && (
                        <p className="text-xs text-slate-500 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
