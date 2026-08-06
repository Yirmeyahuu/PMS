import { useState, useEffect } from 'react';
import { Search, Loader2, FileText, Plus, Navigation } from 'lucide-react';
import { getActiveTemplates } from '@/features/clinical-template/clinical-templates.api';
import type { ClinicalTemplate } from '@/types/clinicalTemplate';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { useNavigate } from 'react-router-dom';

export const WorkspaceTemplatesPanel = () => {
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { setEditorContext } = useClinicalWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchTemplates = async () => {
      try {
        const data = await getActiveTemplates();
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
    t.discipline.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const disciplines = Array.from(new Set(filteredTemplates.map(t => t.discipline).filter(Boolean)));

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
        <h3 className="text-sm font-medium text-slate-900 mb-1">No Templates Found</h3>
        <p className="text-xs text-slate-500 mb-4">You haven't created any clinical templates yet.</p>
        <button
          onClick={() => navigate('/manage', { state: { activeCategory: 'clinical', activeItem: 'clinical2' } })}
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
        {disciplines.length === 0 && searchTerm && (
          <div className="text-center py-10 text-slate-400 text-sm">
            No templates match your search.
          </div>
        )}
        
        {disciplines.map((discipline) => (
          <div key={discipline} className="mb-4 last:mb-0">
            <div className="flex items-center gap-3 px-2 mb-2">
              <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {discipline}
              </h4>
              <div className="h-px flex-1 bg-slate-200/60" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates
                .filter(t => t.discipline === discipline)
                .map(template => (
                  <button
                    key={template.id}
                    onClick={() => setEditorContext({ type: 'NEW_NOTE', templateId: template.id })}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left bg-emerald-50/50 hover:bg-emerald-100/50 border border-emerald-100 hover:border-emerald-200 group transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center shrink-0 group-hover:bg-emerald-200/50 transition-colors">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-900 truncate">
                        {template.name}
                      </p>
                      {template.description && (
                        <p className="text-xs text-slate-500 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-emerald-300 opacity-0 group-hover:opacity-100 group-hover:text-emerald-600 transition-all" />
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
