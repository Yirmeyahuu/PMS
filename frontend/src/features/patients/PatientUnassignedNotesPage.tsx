import { useMemo, useState, useEffect } from 'react';
import { CheckCircle, Clock, FolderKanban, Loader2, Pencil, User, ShieldCheck, FileCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { EditClinicalNoteModal } from '@/features/clinical-template/components/EditClinicalNoteModal';
import { ViewClinicalNoteModal } from '@/features/clinical-template/components/ViewClinicalNoteModal';
import { usePatientProfileContext } from './context/PatientProfileContext';
import { assignNoteToCase } from './patientCases.api';
import { formatDate } from './patientProfile.utils.tsx';
import type { ClinicalNote } from '@/types/clinicalTemplate';
import { getPatientConsentDocuments, assignConsentDocument, type PatientConsentDocumentRecord } from './patient.api';
import { getLetters, assignLetterToCase, type Letter } from '@/features/clinical-documentation/api/letters.api';
import { ViewConsentFormModal } from '@/features/patients/components/ViewConsentFormModal';
import { ViewLetterModal } from '@/features/clinical-documentation/components/ViewLetterModal';

export const PatientUnassignedNotesPage = () => {
  const {
    patient,
    clinicalNotes,
    cases,
    loadingPatient,
    loadingNotes,
    refreshClinicalNotes,
  } = usePatientProfileContext();

  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});
  const [assigningNoteId, setAssigningNoteId] = useState<number | null>(null);

  const [consentDocs, setConsentDocs] = useState<PatientConsentDocumentRecord[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [viewingDoc, setViewingDoc] = useState<PatientConsentDocumentRecord | null>(null);
  const [viewingLetter, setViewingLetter] = useState<Letter | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [assigningDocId, setAssigningDocId] = useState<number | null>(null);
  const [assigningLetterId, setAssigningLetterId] = useState<number | null>(null);

  // Fetch unassigned docs and letters on mount
  useEffect(() => {
    if (!patient) return;
    const fetchDocs = async () => {
      setLoadingDocs(true);
      try {
        const [docs, fetchedLetters] = await Promise.all([
          getPatientConsentDocuments(patient.id),
          getLetters({ patient: patient.id })
        ]);
        setConsentDocs(docs.filter(d => !d.patient_case_id && !d.patient_case));
        setLetters(fetchedLetters.filter(l => !l.patient_case));
      } catch (err) {
        console.error('Failed to load unassigned documents', err);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [patient]);

  // Notes with no case assignment
  const unassignedNotes = useMemo<ClinicalNote[]>(() => {
    if (!patient) return [];
    return clinicalNotes.filter((note) => !note.patient_case);
  }, [patient, clinicalNotes]);

  const handleAssign = (note: ClinicalNote, caseId: number) => {
    if (!patient || !caseId) return;

    setAssigningNoteId(note.id);
    assignNoteToCase(note.id, caseId)
      .then(() => {
        const targetCase = cases.find((c) => c.id === caseId);
        toast.success(`Note assigned to "${targetCase?.title ?? 'case'}"`);
        // Clear the pending selection for this note then refresh
        setPendingAssignments((prev) => {
          const next = { ...prev };
          delete next[note.id];
          return next;
        });
        void refreshClinicalNotes();
      })
      .catch(() => {
        toast.error('Failed to assign note');
      })
      .finally(() => {
        setAssigningNoteId(null);
      });
  };

  const handleAssignDoc = (docId: number, caseId: number) => {
    if (!patient || !caseId) return;
    setAssigningDocId(docId);
    assignConsentDocument(patient.id, docId, caseId)
      .then(() => {
        const targetCase = cases.find((c) => c.id === caseId);
        toast.success(`Document assigned to "${targetCase?.title ?? 'case'}"`);
        setConsentDocs(prev => prev.filter(d => d.id !== docId));
      })
      .catch(() => toast.error('Failed to assign document'))
      .finally(() => setAssigningDocId(null));
  };

  const handleAssignLetter = (letterId: number, caseId: number) => {
    if (!patient || !caseId) return;
    setAssigningLetterId(letterId);
    assignLetterToCase(letterId, caseId)
      .then(() => {
        const targetCase = cases.find((c) => c.id === caseId);
        toast.success(`Letter assigned to "${targetCase?.title ?? 'case'}"`);
        setLetters(prev => prev.filter(l => l.id !== letterId));
      })
      .catch(() => toast.error('Failed to assign letter'))
      .finally(() => setAssigningLetterId(null));
  };

  if (loadingPatient || !patient) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-200">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-heading text-gray-900">Unassigned Notes and Letters</h1>
            <p className="text-sm text-gray-500 mt-1">
              These items are not linked to any case. Use the dropdown on each card to assign them.
            </p>
          </div>
        </div>

        {/* Content */}
        {loadingNotes || loadingDocs ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
          </div>
        ) : unassignedNotes.length === 0 && consentDocs.length === 0 && letters.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">All items are assigned</p>
            <p className="text-xs text-gray-500 mt-1">
              Every clinical note, letter, and document for this patient is linked to a case.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unassignedNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-sky-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Note info — clickable to view */}
                  <button
                    type="button"
                    onClick={() => setViewingNoteId(note.id)}
                    className="flex-1 text-left group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-sky-700 transition-colors">
                        {note.template_name || 'Clinical Note'}
                      </p>
                      {note.status === 'finalized' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Signed
                        </span>
                      )}
                      {note.status === 'drafted' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Drafted
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(note.date)}
                      </span>
                      {note.practitioner_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {note.practitioner_name}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(note.id)}
                      className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      title="Edit note"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {cases.length === 0 ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400 italic">
                        <FolderKanban className="w-3.5 h-3.5" />
                        No cases yet
                      </span>
                    ) : (
                      <>
                        <select
                          value={pendingAssignments[note.id] ?? ''}
                          onChange={(event) => {
                            const val = event.target.value;
                            setPendingAssignments((prev) => ({ ...prev, [note.id]: val }));
                          }}
                          disabled={assigningNoteId === note.id}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 max-w-45"
                        >
                          <option value="">Assign to case…</option>
                          {cases.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.title}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!pendingAssignments[note.id] || assigningNoteId === note.id}
                          onClick={() => handleAssign(note, Number(pendingAssignments[note.id]))}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {assigningNoteId === note.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Assign'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {consentDocs.map((doc) => (
              <div
                key={`doc-${doc.id}`}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-sky-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setViewingDoc(doc)}
                    className="flex-1 text-left group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900">
                        {doc.type === 'DATA_PRIVACY_CONSENT' ? 'Data Privacy Form' : 'Clinic Consent Form'}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Signed
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(doc.signed_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        {doc.type === 'DATA_PRIVACY_CONSENT' ? <ShieldCheck className="w-3 h-3" /> : <FileCheck className="w-3 h-3" />}
                        Consent Document
                      </span>
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {cases.length === 0 ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400 italic">
                        <FolderKanban className="w-3.5 h-3.5" />
                        No cases yet
                      </span>
                    ) : (
                      <>
                        <select
                          value={pendingAssignments[`doc-${doc.id}`] ?? ''}
                          onChange={(event) => {
                            const val = event.target.value;
                            setPendingAssignments((prev) => ({ ...prev, [`doc-${doc.id}`]: val }));
                          }}
                          disabled={assigningDocId === doc.id}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 max-w-45"
                        >
                          <option value="">Assign to case…</option>
                          {cases.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.title}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!pendingAssignments[`doc-${doc.id}`] || assigningDocId === doc.id}
                          onClick={() => handleAssignDoc(doc.id, Number(pendingAssignments[`doc-${doc.id}`]))}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {assigningDocId === doc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Assign'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {letters.map((letter) => (
              <div
                key={`letter-${letter.id}`}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-sky-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setViewingLetter(letter)}
                    className="flex-1 text-left group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900">
                        {letter.subject || 'Letter'}
                      </p>
                      {letter.status === 'FINAL' || letter.status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-2.5 h-2.5" />
                          {letter.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {letter.status}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(letter.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Letter
                      </span>
                      {letter.practitioner_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {letter.practitioner_name}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {cases.length === 0 ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400 italic">
                        <FolderKanban className="w-3.5 h-3.5" />
                        No cases yet
                      </span>
                    ) : (
                      <>
                        <select
                          value={pendingAssignments[`letter-${letter.id}`] ?? ''}
                          onChange={(event) => {
                            const val = event.target.value;
                            setPendingAssignments((prev) => ({ ...prev, [`letter-${letter.id}`]: val }));
                          }}
                          disabled={assigningLetterId === letter.id}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 max-w-45"
                        >
                          <option value="">Assign to case…</option>
                          {cases.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.title}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!pendingAssignments[`letter-${letter.id}`] || assigningLetterId === letter.id}
                          onClick={() => handleAssignLetter(letter.id, Number(pendingAssignments[`letter-${letter.id}`]))}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {assigningLetterId === letter.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Assign'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingNoteId && (
        <ViewClinicalNoteModal
          isOpen={Boolean(viewingNoteId)}
          onClose={() => setViewingNoteId(null)}
          noteId={viewingNoteId}
        />
      )}

      {editingNoteId && (
        <EditClinicalNoteModal
          isOpen={Boolean(editingNoteId)}
          onClose={() => setEditingNoteId(null)}
          noteId={editingNoteId}
          patientId={patient.id}
          cases={cases}
          onSuccess={() => {
            setEditingNoteId(null);
            void refreshClinicalNotes();
          }}
        />
      )}

      {viewingDoc && (
        <ViewConsentFormModal
          isOpen={true}
          consent={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onSendEmail={() => {}}
        />
      )}

      {viewingLetter && (
        <ViewLetterModal
          isOpen={Boolean(viewingLetter)}
          onClose={() => setViewingLetter(null)}
          letter={viewingLetter}
        />
      )}
    </>
  );
};

export default PatientUnassignedNotesPage;
