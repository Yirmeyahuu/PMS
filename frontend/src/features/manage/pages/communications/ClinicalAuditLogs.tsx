import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Loader2, Calendar, User, Eye
} from 'lucide-react';
import { getGlobalAuditLogs, getNote, getTemplate } from '@/features/clinical-template/clinical-templates.api';
import type { GlobalClinicalNoteAuditLog } from '@/features/clinical-template/clinical-templates.api';
import { ClinicalNoteHistoryModal } from '@/features/clinical-template/components/ClinicalNoteHistoryModal';
import toast from 'react-hot-toast';

export const ClinicalAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<GlobalClinicalNoteAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // History Modal State
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [templateStructure, setTemplateStructure] = useState<any>(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  const fetchLogs = async (overrideSearch?: string) => {
    setLoading(true);
    try {
      const data = await getGlobalAuditLogs({
        start_date: startDate,
        end_date: endDate,
        search: overrideSearch !== undefined ? overrideSearch : search
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  };

  const formatNoteDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getActionColor = (action: string) => {
    switch(action) {
      case 'CREATED': return 'text-green-700 bg-green-50 border-green-200';
      case 'UPDATED': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'SIGNED': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'DELETED': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const handleViewHistory = async (noteId: number) => {
    setLoadingHistoryId(noteId);
    try {
      const note = await getNote(noteId);
      if (note.template) {
        const template = await getTemplate(note.template);
        setTemplateStructure(template.structure);
      } else {
        setTemplateStructure({ sections: [] });
      }
      setSelectedNoteId(noteId);
    } catch (err) {
      console.error('Failed to load note/template for history:', err);
      toast.error('Failed to load note history context');
    } finally {
      setLoadingHistoryId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden rounded-lg shadow-sm border border-gray-200">
      
      {/* ─── Header & Filters ─── */}
      <div className="p-6 border-b border-gray-200 bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Clinical Note Audit Logs</h2>
        
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by User or Patient Name..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* ─── Table Area ─── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-900 mb-1">No Audit Logs Found</p>
            <p className="text-sm">Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Note Date</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{log.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{log.patient_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatNoteDate(log.note_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewHistory(log.clinical_note)}
                        disabled={loadingHistoryId === log.clinical_note}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 w-full disabled:opacity-50"
                        title="View Full History"
                      >
                        {loadingHistoryId === log.clinical_note ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        <span className="hidden lg:inline">History</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History Modal */}
      {selectedNoteId && (
        <ClinicalNoteHistoryModal
          isOpen={true}
          onClose={() => {
            setSelectedNoteId(null);
            setTemplateStructure(null);
          }}
          noteId={selectedNoteId}
          templateStructure={templateStructure} // Now using fetched structure
        />
      )}
    </div>
  );
};

export default ClinicalAuditLogs;
