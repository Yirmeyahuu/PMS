import React, { useState, useEffect } from 'react';
import { previewPatientMerge, executePatientMerge, getPatients } from '../patient.api';
import type { PatientMergePreview } from '../patient.api';
import type { Patient } from '@/types';
import { toast } from 'react-hot-toast';
import { Loader2, AlertTriangle, ArrowRight, CheckCircle2, X } from 'lucide-react';

interface MergePatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrimaryPatient?: Patient | null;
  onMergeSuccess?: () => void;
}

export function MergePatientsModal({ isOpen, onClose, initialPrimaryPatient, onMergeSuccess }: MergePatientsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Select, 2: Preview, 3: Success
  
  const [primaryPatient, setPrimaryPatient] = useState<Patient | null>(initialPrimaryPatient || null);
  const [duplicatePatient, setDuplicatePatient] = useState<Patient | null>(null);
  
  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrimaryPatient(initialPrimaryPatient || null);
      setDuplicatePatient(null);
      setStep(1);
      setPrimarySearch('');
      setDuplicateSearch('');
      setPrimaryResults([]);
      setDuplicateResults([]);
      setPreviewData(null);
      setMergeReason('');
    }
  }, [isOpen, initialPrimaryPatient]);
  
  const [primarySearch, setPrimarySearch] = useState('');
  const [duplicateSearch, setDuplicateSearch] = useState('');
  
  const [primaryResults, setPrimaryResults] = useState<Patient[]>([]);
  const [duplicateResults, setDuplicateResults] = useState<Patient[]>([]);
  
  const [isSearchingPrimary, setIsSearchingPrimary] = useState(false);
  const [isSearchingDuplicate, setIsSearchingDuplicate] = useState(false);
  
  const [previewData, setPreviewData] = useState<PatientMergePreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeReason, setMergeReason] = useState('');

  // Handle Search Primary
  const handleSearchPrimary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setPrimarySearch(query);
    if (query.length < 2) { setPrimaryResults([]); return; }
    setIsSearchingPrimary(true);
    try {
      const res = await getPatients({ search: query, page_size: 5 });
      // exclude already selected duplicate
      setPrimaryResults(res.results.filter(p => p.id !== duplicatePatient?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPrimary(false);
    }
  };

  // Handle Search Duplicate
  const handleSearchDuplicate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setDuplicateSearch(query);
    if (query.length < 2) { setDuplicateResults([]); return; }
    setIsSearchingDuplicate(true);
    try {
      const res = await getPatients({ search: query, page_size: 5 });
      // exclude already selected primary
      setDuplicateResults(res.results.filter(p => p.id !== primaryPatient?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingDuplicate(false);
    }
  };

  const handlePreview = async () => {
    if (!primaryPatient || !duplicatePatient) return;
    setIsPreviewing(true);
    try {
      const data = await previewPatientMerge(primaryPatient.id, duplicatePatient.id);
      setPreviewData(data);
      setStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to preview merge.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecuteMerge = async () => {
    if (!primaryPatient || !duplicatePatient) return;
    setIsMerging(true);
    try {
      await executePatientMerge(primaryPatient.id, duplicatePatient.id, mergeReason);
      toast.success('Patients merged successfully!');
      setStep(3);
      if (onMergeSuccess) onMergeSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Merge failed.');
    } finally {
      setIsMerging(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setPrimaryPatient(initialPrimaryPatient || null);
    setDuplicatePatient(null);
    setPrimarySearch('');
    setDuplicateSearch('');
    setPrimaryResults([]);
    setDuplicateResults([]);
    setPreviewData(null);
    setMergeReason('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] transition-opacity" onClick={handleClose} />
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Merge Patient Profiles</h2>
                <p className="text-xs text-gray-500">
                  Consolidate duplicate patient records. This action will transfer all clinical and financial history.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-visible flex-1 relative z-10">
            {step === 1 && (
              <div className="space-y-6">
                {/* Primary Patient Selection */}
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Step 1: Select Primary Patient
                  </h3>
                  <p className="text-xs text-blue-700">This patient profile will <strong>SURVIVE</strong> the merge.</p>
                  
                  {primaryPatient ? (
                    <div className="flex justify-between items-center bg-white p-3 rounded border text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{primaryPatient.first_name} {primaryPatient.last_name}</p>
                        <p className="text-xs text-gray-500">DOB: {primaryPatient.date_of_birth} | {primaryPatient.email}</p>
                      </div>
                      {!initialPrimaryPatient && (
                        <button className="text-blue-600 font-medium hover:underline text-sm" onClick={() => setPrimaryPatient(null)}>Change</button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <input 
                        type="text"
                        value={primarySearch} 
                        onChange={handleSearchPrimary} 
                        placeholder="Search by name, email, or phone..." 
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                      {isSearchingPrimary && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-2.5 text-gray-400" />}
                      
                      {primaryResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                          {primaryResults.map(p => (
                            <div 
                              key={p.id} 
                              className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                              onClick={() => { setPrimaryPatient(p); setPrimaryResults([]); setPrimarySearch(''); }}
                            >
                              <p className="font-medium text-sm text-gray-900">{p.first_name} {p.last_name}</p>
                              <p className="text-xs text-gray-500">{p.email || 'No email'} | {p.phone || 'No phone'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Duplicate Patient Selection */}
                <div className="space-y-3 p-4 border rounded-lg bg-red-50/50">
                  <h3 className="font-semibold text-red-900 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Step 2: Select Duplicate Patient
                  </h3>
                  <p className="text-xs text-red-700">This patient profile will be <strong>ARCHIVED</strong> after data is transferred.</p>
                  
                  {duplicatePatient ? (
                    <div className="flex justify-between items-center bg-white p-3 rounded border text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{duplicatePatient.first_name} {duplicatePatient.last_name}</p>
                        <p className="text-xs text-gray-500">DOB: {duplicatePatient.date_of_birth} | {duplicatePatient.email}</p>
                      </div>
                      <button className="text-red-600 font-medium hover:underline text-sm" onClick={() => setDuplicatePatient(null)}>Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input 
                        type="text"
                        value={duplicateSearch} 
                        onChange={handleSearchDuplicate} 
                        placeholder="Search by name, email, or phone..." 
                        disabled={!primaryPatient}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:bg-gray-100"
                      />
                      {isSearchingDuplicate && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-2.5 text-gray-400" />}
                      
                      {duplicateResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                          {duplicateResults.map(p => (
                            <div 
                              key={p.id} 
                              className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                              onClick={() => { setDuplicatePatient(p); setDuplicateResults([]); setDuplicateSearch(''); }}
                            >
                              <p className="font-medium text-sm text-gray-900">{p.first_name} {p.last_name}</p>
                              <p className="text-xs text-gray-500">{p.email || 'No email'} | {p.phone || 'No phone'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && previewData && primaryPatient && duplicatePatient && (
              <div className="space-y-6">
                <div className="bg-yellow-50 text-yellow-900 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Verify Merge Details</p>
                    <p className="text-sm mt-1">This action is irreversible. Please ensure you are merging the correct profiles.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 p-4 border border-red-200 bg-red-50 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Duplicate (Will Archive)</p>
                    <p className="font-bold text-base text-gray-900">{duplicatePatient.first_name} {duplicatePatient.last_name}</p>
                    <p className="text-xs text-gray-600">{duplicatePatient.email}</p>
                  </div>
                  
                  <ArrowRight className="w-8 h-8 text-gray-400 flex-shrink-0" />
                  
                  <div className="flex-1 p-4 border border-blue-200 bg-blue-50 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Primary (Will Survive)</p>
                    <p className="font-bold text-base text-gray-900">{primaryPatient.first_name} {primaryPatient.last_name}</p>
                    <p className="text-xs text-gray-600">{primaryPatient.email}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-3">Records to Transfer</h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <StatCard label="Cases" count={previewData.cases} />
                    <StatCard label="Appointments" count={previewData.appointments} />
                    <StatCard label="Clinical Notes" count={previewData.clinical_notes} />
                    <StatCard label="Invoices" count={previewData.invoices} />
                    <StatCard label="Documents" count={previewData.attachments} />
                    <StatCard label="Letters" count={previewData.letters} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 block">Reason for Merge (Optional)</label>
                  <input 
                    type="text" 
                    value={mergeReason}
                    onChange={e => setMergeReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. Patient created duplicate account via portal"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Merge Complete</h2>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  All records have been successfully transferred and the duplicate profile has been archived.
                </p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0 relative z-0 rounded-b-2xl">
            {step === 1 && (
              <>
                <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white">Cancel</button>
                <button 
                  onClick={handlePreview} 
                  disabled={!primaryPatient || !duplicatePatient || isPreviewing}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPreviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Preview Merge'}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button onClick={() => setStep(1)} disabled={isMerging} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white">Back</button>
                <button 
                  onClick={handleExecuteMerge} 
                  disabled={isMerging}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMerging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Confirm Merge'}
                </button>
              </>
            )}

            {step === 3 && (
              <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors">Done</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg text-center shadow-sm">
      <p className="text-xl font-bold text-gray-900">{count}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}
