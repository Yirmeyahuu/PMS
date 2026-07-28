import { useState, useEffect, useCallback } from 'react';
import { History, Files, Loader2, FileText } from 'lucide-react';
import { getNotes, getActiveTemplates } from '@/features/clinical-template/clinical-templates.api';
import { getAppointments } from '@/features/appointments/appointment.api';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';
import { useClinicalWorkspace } from '../context/ClinicalWorkspaceContext';
import { ClinicalNoteFeedItem } from './ClinicalNoteFeedItem';
import type { ClinicalNote, ClinicalTemplate } from '@/types/clinicalTemplate';
import type { Appointment } from '@/types';

export const WorkspaceRightPanel = () => {
  const { patient } = usePatientProfileContext();
  const { selectedCaseId, refreshTrigger, setEditorContext } = useClinicalWorkspace();
  type Tab = 'notes' | 'letters' | 'documents' | 'history' | 'measures' | 'exercises';
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const [notesData, templatesData, appointmentsData] = await Promise.all([
        getNotes({ 
          patient: patient.id, 
          patient_case: selectedCaseId ? selectedCaseId : -1 // -1 ensures we get nothing if no case is selected, strict filtering
        }),
        getActiveTemplates(),
        getAppointments({ patient: patient.id, page_size: 100 })
      ]);
      setNotes(notesData || []);
      setTemplates(templatesData || []);
      
      const sortedAppointments = (appointmentsData.results || []).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAppointments(sortedAppointments);
    } catch (error) {
      console.error('Failed to fetch workspace data', error);
    } finally {
      setLoading(false);
    }
  }, [patient?.id, selectedCaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);


  const handleRefreshFeed = () => {
    setEditorContext({ type: 'IDLE' });
    fetchData();
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-0 bg-slate-50">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white overflow-x-auto hide-scrollbar flex-shrink-0">
        {[
          { id: 'notes', label: 'Notes', icon: FileText },
          { id: 'letters', label: 'Letters', icon: FileText },
          { id: 'documents', label: 'Documents', icon: Files },
          { id: 'history', label: 'History', icon: History },
          { id: 'measures', label: 'Measures', icon: History },
          { id: 'exercises', label: 'Exercises', icon: History }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex-1 min-w-[120px] py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Feed */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : activeTab === 'notes' ? (
          <div className="max-w-4xl mx-auto">
            {/* Notes Feed */}
            {notes.length === 0 ? (
              <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No Clinical Notes Found</h3>
                <p className="text-sm">Select a template from the left panel to create the first note.</p>
              </div>
            ) : (
              <div className="space-y-6 relative">
                {notes.map((note) => (
                  <div key={note.id} className="relative">
                    {/* Timeline Line Connector */}
                    <div className="absolute left-8 top-16 bottom-[-24px] w-0.5 bg-slate-200 -z-10 last:hidden" />
                    
                    <ClinicalNoteFeedItem
                      note={note}
                      appointments={appointments}
                      templates={templates}
                      onRefreshFeed={handleRefreshFeed}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm max-w-4xl mx-auto">
            <Files className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">Documents Support Coming Soon</h3>
          </div>
        )}
      </div>
    </div>
  );
};
