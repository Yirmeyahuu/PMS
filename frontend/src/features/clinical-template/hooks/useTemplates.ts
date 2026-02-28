import { useState, useEffect, useCallback } from 'react';
import {
  getTemplates,
  createTemplate as apiCreateTemplate,
  updateTemplate as apiUpdateTemplate,
  archiveTemplate as apiArchiveTemplate,
  createTemplateVersion as apiCreateVersion,
} from '../clinical-templates.api';
import type { ClinicalTemplate } from '@/types/clinicalTemplate';
import toast from 'react-hot-toast';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: Partial<ClinicalTemplate>) => {
    setSaving(true);
    try {
      const created = await apiCreateTemplate(data);
      setTemplates((prev) => [created, ...prev]);
      toast.success('Template created');
      return created;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create template');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = async (id: number, data: Partial<ClinicalTemplate>) => {
    setSaving(true);
    try {
      const updated = await apiUpdateTemplate(id, data);
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success('Template updated');
      return updated;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update template');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const archiveTemplate = async (id: number) => {
    try {
      await apiArchiveTemplate(id);
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_archived: true, is_active: false } : t))
      );
      toast.success('Template archived');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to archive template');
      throw err;
    }
  };

  const createVersion = async (id: number) => {
    try {
      const newVersion = await apiCreateVersion(id);
      setTemplates((prev) => [newVersion, ...prev]);
      toast.success(`Version ${newVersion.version} created`);
      return newVersion;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create version');
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
    createVersion,
    refetch: fetchTemplates,
  };
};