import { useState, useEffect, useCallback } from 'react';
import { getNote, updateNote, signNote as apiSignNote } from '../clinical-templates.api';
import { getTemplate } from '../clinical-templates.api';
import type { ClinicalNote, ClinicalTemplate } from '@/types/clinicalTemplate';
import toast from 'react-hot-toast';

export const useClinicalNote = (noteId: number | null) => {
  const [note, setNote] = useState<ClinicalNote | null>(null);
  const [template, setTemplate] = useState<ClinicalTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const data = await getNote(noteId);
      setNote(data);

      // Fetch the associated template if available
      if (data.template) {
        const tmpl = await getTemplate(data.template);
        setTemplate(tmpl);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load note');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const saveNote = async (data: { content: Record<string, any> }, isAutosave = false) => {
    if (!noteId) return;
    setSaving(true);
    try {
      const updated = await updateNote(noteId, data);
      setNote(updated);
      if (!isAutosave) toast.success('Note saved');
    } catch (err: any) {
      if (!isAutosave) toast.error(err.response?.data?.detail || 'Failed to save note');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const signNote = async () => {
    if (!noteId) return;
    setSaving(true);
    try {
      const signed = await apiSignNote(noteId);
      setNote(signed);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to sign note');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { note, template, loading, saving, saveNote, signNote };
};