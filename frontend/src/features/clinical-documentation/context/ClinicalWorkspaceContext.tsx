import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type EditorContextType = 
  | { type: 'IDLE' }
  | { type: 'NEW_NOTE', templateId: number }
  | { type: 'EDIT_NOTE', noteId: number }
  | { type: 'VIEW_NOTE', noteId: number }
  | { type: 'COPY_NOTE', sourceNoteId: number }
  | { type: 'NEW_LETTER', templateId: number }
  | { type: 'EDIT_LETTER', letterId: number }
  | { type: 'VIEW_LETTER', letterId: number }
  | { type: 'VIEW_DOCUMENT', documentId: number };

export interface ClinicalWorkspaceState {
  selectedCaseId: number | null;
  setSelectedCaseId: (id: number | null) => void;
  editorContext: EditorContextType;
  setEditorContext: (ctx: EditorContextType) => void;
  // Trigger history/documents refresh
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ClinicalWorkspaceContext = createContext<ClinicalWorkspaceState | undefined>(undefined);

export const ClinicalWorkspaceProvider = ({ children, initialCaseId }: { children: ReactNode, initialCaseId?: number | null }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(initialCaseId ?? null);
  const [editorContext, setEditorContext] = useState<EditorContextType>({ type: 'IDLE' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <ClinicalWorkspaceContext.Provider value={{
      selectedCaseId,
      setSelectedCaseId,
      editorContext,
      setEditorContext,
      refreshTrigger,
      triggerRefresh,
    }}>
      {children}
    </ClinicalWorkspaceContext.Provider>
  );
};

export const useClinicalWorkspace = () => {
  const ctx = useContext(ClinicalWorkspaceContext);
  if (!ctx) throw new Error('useClinicalWorkspace must be used within ClinicalWorkspaceProvider');
  return ctx;
};
