import React, { useState, useEffect } from 'react';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Practitioner } from '@/features/clinics/clinic.api';
import type { PatientCase, PatientCaseStatus, PatientCasePayer } from '@/types/patient';

export interface CaseFormData {
  title: string;
  status: PatientCaseStatus;
  primaryPractitionerId: string;
  primaryPractitionerName: string;
  payer: PatientCasePayer;
  alertNotes: string;
  sessionSource?: 'MANUAL' | 'PACKAGE' | 'HMO';
  approvedSessions?: number;
  isUnlimited: boolean;
  referredBy: string;
  referralInfo: string;
  description: string;
}

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Partial<PatientCase>;
  onSave: (data: CaseFormData) => void;
  practitioners: Practitioner[];
  loadingPractitioners: boolean;
  /** When true, the Primary Practitioner field is shown read-only (auto-filled from the appointment). */
  autoFocusField?: 'approved_sessions';
  lockPractitioner?: boolean;
}

export const CaseModal = ({ isOpen, onClose, mode, initialValues, onSave, practitioners, loadingPractitioners, lockPractitioner, autoFocusField }: CaseModalProps) => {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [status, setStatus] = useState<PatientCaseStatus>(initialValues?.status ?? 'OPEN');
  const [primaryPractitionerId, setPrimaryPractitionerId] = useState(initialValues?.primary_practitioner ? String(initialValues.primary_practitioner) : '');
  const [primaryPractitionerName, setPrimaryPractitionerName] = useState(initialValues?.primary_practitioner_name ?? '');
  const [payer, setPayer] = useState<PatientCasePayer>(initialValues?.payer ?? '');
  const [alertNotes, setAlertNotes] = useState(initialValues?.alert_notes ?? '');
  
  // Session Management State
  const approvedSessionsRef = React.useRef<HTMLInputElement>(null);
  const [approvedSessions, setApprovedSessions] = useState<number | ''>(initialValues?.approved_sessions ?? '');
  const [isUnlimited, setIsUnlimited] = useState<boolean>(initialValues?.is_unlimited ?? false);
  
  // Progress (Read-Only for Edit mode)
  const completedSessions = initialValues?.completed_sessions ?? 0;
  const remainingSessions = initialValues?.remaining_sessions ?? null;

  const [referredBy, setReferredBy] = useState(initialValues?.referred_by ?? '');
  const [referralInfo, setReferralInfo] = useState(initialValues?.referral_info ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');


  useEffect(() => {
    if (isOpen) {
      setTitle(initialValues?.title ?? '');
      setStatus(initialValues?.status ?? 'OPEN');
      setPrimaryPractitionerId(initialValues?.primary_practitioner ? String(initialValues.primary_practitioner) : '');
      setPrimaryPractitionerName(initialValues?.primary_practitioner_name ?? '');
      setPayer(initialValues?.payer ?? '');
      setAlertNotes(initialValues?.alert_notes ?? '');
      setApprovedSessions(initialValues?.approved_sessions ?? '');
      setIsUnlimited(initialValues?.is_unlimited ?? false);
      setReferredBy(initialValues?.referred_by ?? '');
      setReferralInfo(initialValues?.referral_info ?? '');
      setDescription(initialValues?.description ?? '');
      
      if (autoFocusField === 'approved_sessions') {
        setTimeout(() => {
          approvedSessionsRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, initialValues, autoFocusField]);

  const handlePractitionerChange = (id: string) => {

    setPrimaryPractitionerId(id);
    const found = practitioners.find((p) => String(p.id) === id);
    setPrimaryPractitionerName(found?.name ?? '');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-6xl bg-white rounded-xl shadow-2xl pointer-events-auto max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {mode === 'create' ? 'Create New Case' : 'Edit Case'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {mode === 'create'
                  ? 'Define a case to organize patient notes and follow-up actions.'
                  : 'Update case details and assignment.'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ── Left Column ── */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Case Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Post-op Knee Recovery"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PatientCaseStatus)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="OPEN">Open</option>
                    <option value="MONITORING">Monitoring</option>
                    <option value="DISCHARGED">Discharged</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Primary Practitioner</label>
                  {lockPractitioner ? (
                    <div className="px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">
                      {primaryPractitionerName || <span className="text-gray-400 italic">Unassigned</span>}
                    </div>
                  ) : loadingPractitioners ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading practitioners...
                    </div>
                  ) : (
                    <select
                      value={primaryPractitionerId}
                      onChange={(e) => handlePractitionerChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">— Not assigned —</option>
                      {practitioners.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payer</label>
                  <select
                    value={payer}
                    onChange={(e) => setPayer(e.target.value as PatientCasePayer)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">— Select payer —</option>
                    <option value="PRIVATE">Private Pay</option>
                    <option value="HMO">HMO</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="CORPORATE">Corporate</option>
                  </select>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-800">Session Management</h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Approved Sessions</label>
                      <input
                        type="number"
                        min="0"
                        value={isUnlimited ? '' : approvedSessions}
                        onChange={(e) => setApprovedSessions(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={isUnlimited || initialValues?.session_source === 'PACKAGE'}
                        placeholder={isUnlimited ? "Unlimited" : "Enter amount"}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="unlimited-sessions"
                      checked={isUnlimited}
                      onChange={(e) => {
                        setIsUnlimited(e.target.checked);
                        if (e.target.checked) setApprovedSessions('');
                      }}
                      disabled={initialValues?.session_source === 'PACKAGE'}
                      className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500 disabled:opacity-50"
                    />
                    <label htmlFor="unlimited-sessions" className="text-sm font-medium text-gray-700">
                      Unlimited Sessions
                    </label>
                  </div>

                  {mode === 'edit' && !isUnlimited && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Completed</p>
                        <p className="text-sm font-semibold text-gray-900">{completedSessions}</p>
                      </div>
                      <div className="h-8 w-px bg-gray-300"></div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Remaining</p>
                        <p className="text-sm font-semibold text-gray-900">{remainingSessions ?? '—'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right Column ── */}
              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Alert Notes
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 leading-none">CASE-WIDE</span>
                  </label>
                  <textarea
                    value={alertNotes}
                    onChange={(e) => setAlertNotes(e.target.value)}
                    rows={4}
                    placeholder="Persistent alerts visible across all sessions for this case..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-800">Referral <span className="text-gray-400 font-normal">(Optional)</span></h4>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Referred By</label>
                    <input
                      type="text"
                      value={referredBy}
                      onChange={(e) => setReferredBy(e.target.value)}
                      placeholder="e.g., Dr. Smith"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Referral Notes</label>
                    <textarea
                      value={referralInfo}
                      onChange={(e) => setReferralInfo(e.target.value)}
                      rows={3}
                      placeholder="Additional referral information..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Add context, goals, and notes for this case"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) {
                  toast.error('Case title is required');
                  return;
                }
                onSave({ 
                  title: title.trim(), 
                  status, 
                  primaryPractitionerId, 
                  primaryPractitionerName, 
                  payer, 
                  alertNotes, 
                  sessionSource: initialValues?.session_source ?? 'MANUAL',
                  approvedSessions: isUnlimited ? undefined : (approvedSessions === '' ? undefined : approvedSessions),
                  isUnlimited,
                  referredBy, 
                  referralInfo, 
                  description 
                });
              }}
              className="px-3 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
            >
              {mode === 'create' ? 'Create Case' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
