import React, { useState, useEffect } from 'react';
import { DashboardLayout }   from '@/features/dashboard/components/DashboardLayout';
import { ContactList }       from './components/ContactList';
import { ContactFilters }    from './components/ContactFilters';
import { AddContactModal }   from './components/AddContactModal';
import { EditContactModal }  from './components/EditContactModal';
import { ViewContactModal }  from './components/ViewContactModal';
import { SendContactEmailModal } from './components/SendContactEmailModal';
import { Users, Plus, Filter, Search, Loader2 } from 'lucide-react';
import { useContacts } from './hooks/useContacts';
import {
  createContact, updateContact,
  toggleContactPreferred, toggleContactActive,
} from './contact.api';
import type { Contact, CreateContactData } from '@/types';
import toast from 'react-hot-toast';

interface FilterOptions {
  contact_type: string;
  is_active:    boolean | null;
  is_preferred: boolean | null;
}

export const Contacts: React.FC = () => {
  const {
    contacts, isLoading, error, totalCount,
    filters, updateFilters, setPage, refresh,
  } = useContacts();

  const [searchQuery,     setSearchQuery]     = useState('');
  const [isFilterOpen,    setIsFilterOpen]    = useState(false);
  const [isAddOpen,       setIsAddOpen]       = useState(false);
  const [isEditOpen,      setIsEditOpen]      = useState(false);
  const [isViewOpen,      setIsViewOpen]      = useState(false);
  const [isEmailOpen,     setIsEmailOpen]     = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [currentFilters,  setCurrentFilters]  = useState<FilterOptions>({
    contact_type: '', is_active: null, is_preferred: null,
  });

  /* Debounced search */
  useEffect(() => {
    const t = setTimeout(() => updateFilters({ search: searchQuery || undefined }), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── Handlers ─────────────────────────────────────────── */
  const handleAddSubmit = async (data: CreateContactData) => {
    const { clinic: _c, ...payload } = data;
    await createContact(payload as CreateContactData);
    toast.success('Contact added successfully');
    refresh();
  };

  const handleEditSubmit = async (id: number, data: Partial<CreateContactData>) => {
    await updateContact(id, data);
    toast.success('Contact updated successfully');
    refresh();
    /* keep view modal in sync */
    if (selectedContact?.id === id)
      setSelectedContact(prev => prev ? { ...prev, ...data } : prev);
  };

  const handleView = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewOpen(false);
    setIsEditOpen(true);
  };

  const handleTogglePreferred = async (contact: Contact) => {
    try {
      const updated = await toggleContactPreferred(contact.id);
      toast.success(contact.is_preferred ? 'Removed from preferred' : 'Marked as preferred');
      refresh();
      if (selectedContact?.id === contact.id) setSelectedContact(updated);
    } catch { toast.error('Failed to update contact'); }
  };

  const handleToggleActive = async (contact: Contact) => {
    try {
      const updated = await toggleContactActive(contact.id);
      toast.success(contact.is_active ? 'Contact archived' : 'Contact restored');
      refresh();
      if (selectedContact?.id === contact.id) setSelectedContact(updated);
    } catch { toast.error('Failed to update contact'); }
  };

  const handleApplyFilters = (f: FilterOptions) => {
    setCurrentFilters(f);
    updateFilters({
      contact_type: f.contact_type || undefined,
      is_active:    f.is_active    !== null ? f.is_active    : undefined,
      is_preferred: f.is_preferred !== null ? f.is_preferred : undefined,
    });
  };

  const handleSendEmail = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEmailOpen(true);
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
              <p className="text-xs text-gray-400">
                Professional contacts &amp; referrals — {totalCount} total
              </p>
            </div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, organization, specialty…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm
                           focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400
                           focus:border-transparent transition"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600
                           rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white
                           rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Contact</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex-shrink-0 mx-4 mt-4 flex items-center gap-3 bg-red-50 border border-red-200
                          rounded-xl px-4 py-3 text-sm text-red-700">
            <p className="flex-1">{error}</p>
            <button onClick={refresh} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium">
              Retry
            </button>
          </div>
        )}

        {/* List */}
        {isLoading && contacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading contacts…</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ContactList
              contacts={contacts}
              currentPage={filters.page || 1}
              totalPages={Math.ceil(totalCount / (filters.page_size || 10))}
              onPageChange={setPage}
              onView={handleView}
              onEdit={handleEdit}
              onTogglePreferred={handleTogglePreferred}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AddContactModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddSubmit}
      />

      <EditContactModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        contact={selectedContact}
      />

      <ViewContactModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        contact={selectedContact}
        onEdit={handleEdit}
        onTogglePreferred={handleTogglePreferred}
        onToggleActive={handleToggleActive}
        onSendEmail={handleSendEmail}
      />

      <SendContactEmailModal
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        contact={selectedContact}
        clinicName="Our Clinic"
        clinicAddress=""
      />

      <ContactFilters
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={currentFilters}
      />
    </DashboardLayout>
  );
};