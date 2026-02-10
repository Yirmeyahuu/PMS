import { useState, useEffect, useCallback } from 'react';
import { getContacts, type ContactFilters } from '../contact.api';
import type { Contact } from '@/types';
import toast from 'react-hot-toast';

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<ContactFilters>({
    page: 1,
    page_size: 10,
  });

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getContacts(filters);
      setContacts(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to load contacts';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const updateFilters = useCallback((newFilters: Partial<ContactFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    isLoading,
    error,
    totalCount,
    filters,
    updateFilters,
    setPage,
    refresh,
  };
};