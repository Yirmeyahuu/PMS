import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ContactList } from './components/ContactList';
import { ContactFilters } from './components/ContactFilters';
import { Users, Plus, Filter, Search, Loader2 } from 'lucide-react';
import { useContacts } from './hooks/useContacts';
import { toggleContactPreferred } from './contact.api';
import type { Contact } from '@/types';
import toast from 'react-hot-toast';

interface FilterOptions {
  contact_type: string;
  is_active: boolean | null;
  is_preferred: boolean | null;
}

export const Contacts: React.FC = () => {
  const {
    contacts,
    isLoading,
    error,
    totalCount,
    filters,
    updateFilters,
    setPage,
    refresh,
  } = useContacts();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    contact_type: '',
    is_active: null,
    is_preferred: null,
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ search: searchQuery || undefined });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAddContact = () => {
    setIsAddModalOpen(true);
    toast.info('Contact modal coming soon!');
  };

  const handleViewContact = (contact: Contact) => {
    toast.info('View contact modal coming soon!');
  };

  const handleEditContact = (contact: Contact) => {
    toast.info('Edit contact modal coming soon!');
  };

  const handleFilterContacts = () => {
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setCurrentFilters(newFilters);

    updateFilters({
      contact_type: newFilters.contact_type || undefined,
      is_active:
        newFilters.is_active !== null ? newFilters.is_active : undefined,
      is_preferred:
        newFilters.is_preferred !== null ? newFilters.is_preferred : undefined,
    });
  };

  const handleTogglePreferred = async (contact: Contact) => {
    try {
      await toggleContactPreferred(contact.id);
      toast.success(
        contact.is_preferred
          ? 'Removed from preferred contacts'
          : 'Added to preferred contacts'
      );
      refresh();
    } catch (error) {
      toast.error('Failed to update contact');
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Contacts
                </h1>
                <p className="text-sm text-gray-600">
                  Manage your professional contacts and referrals ({totalCount}{' '}
                  total)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search contact name, company..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleFilterContacts}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Filter className="w-5 h-5" />
                <span className="hidden sm:inline">Filter Contacts</span>
              </button>
              <button
                onClick={handleAddContact}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Contact</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex-shrink-0 bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex items-center gap-3">
              <div className="text-red-700">
                <p className="font-medium">Error loading contacts</p>
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={refresh}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && contacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading contacts...</p>
            </div>
          </div>
        ) : (
          /* Contact List */
          <div className="flex-1 overflow-hidden">
            <ContactList
              contacts={contacts}
              currentPage={filters.page || 1}
              totalPages={Math.ceil(totalCount / (filters.page_size || 10))}
              onPageChange={setPage}
              onView={handleViewContact}
              onEdit={handleEditContact}
              onTogglePreferred={handleTogglePreferred}
            />
          </div>
        )}

        {/* Filter Modal */}
        <ContactFilters
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={handleApplyFilters}
          currentFilters={currentFilters}
        />
      </div>
    </DashboardLayout>
  );
};