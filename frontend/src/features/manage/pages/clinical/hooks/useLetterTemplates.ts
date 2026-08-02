import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  getLetterTemplates, 
  createLetterTemplate as createAPI, 
  updateLetterTemplate as updateAPI, 
  archiveLetterTemplate as archiveAPI
} from '@/features/clinical-documentation/api/letterTemplates.api';
import type { LetterTemplate } from '@/features/clinical-documentation/api/letterTemplates.api';

export const useLetterTemplates = () => {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLetterTemplates();
      setTemplates(data);
    } catch (err) {
      toast.error('Failed to load letter templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: Partial<LetterTemplate>) => {
    try {
      setSaving(true);
      await createAPI(data);
      toast.success('Letter Template created successfully');
      await fetchTemplates();
    } catch (err) {
      toast.error('Failed to create letter template');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = async (id: number, data: Partial<LetterTemplate>) => {
    try {
      setSaving(true);
      await updateAPI(id, data);
      toast.success('Letter Template updated successfully');
      await fetchTemplates();
    } catch (err) {
      toast.error('Failed to update letter template');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const archiveTemplate = async (id: number) => {
    try {
      await archiveAPI(id);
      toast.success('Letter Template archived');
      await fetchTemplates();
    } catch (err) {
      toast.error('Failed to archive letter template');
      throw err;
    }
  };

  return {
    templates,
    loading,
    saving,
    createTemplate,
    updateTemplate,
    archiveTemplate,
    refreshTemplates: fetchTemplates
  };
};
