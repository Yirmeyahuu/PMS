import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PatientList } from './PatientList';
import { PatientFilters } from './components/PatientFilters';
import { PatientModal } from './components/PatientModal';
import { PatientDetailsModal } from './components/PatientDetailsModal';
import { Users, Plus, Filter, Search, Loader2, Archive, ArchiveRestore } from 'lucide-react';
import { usePatients } from './hooks/usePatients';
import { createPatient, updatePatient } from './patient.api';
import type { Patient, CreatePatientData } from '@/types';
import toast from 'react-hot-toast';

interface FilterOptions {
  gender: '' | 'M' | 'F' | 'O';
  is_active: boolean | null;
}

export const Clients: React.FC = () => {
  const {
    patients,
    isLoading,
    error,
    totalCount,
    filters,
    view,
    updateFilters,
    setPage,
    refresh,
    switchView,
    handleArchive,
    handleRestore,
  } = usePatients();

  const [searchQuery,        setSearchQuery]        = useState('');
  const [isFilterModalOpen,  setIsFilterModalOpen]  = useState(false);
  const [isAddModalOpen,     setIsAddModalOpen]      = useState(false);
  const [isEditModalOpen,    setIsEditModalOpen]     = useState(false);
  const [isViewModalOpen,    setIsViewModalOpen]     = useState(false);
  const [selectedPatient,    setSelectedPatient]     = useState<Patient | null>(null);
  const [currentFilters,     setCurrentFilters]      = useState<FilterOptions>({ gender: '', is_active: null });
  const [archiveConfirm,     setArchiveConfirm]      = useState<Patient | null>(null);
  const [restoreConfirm,     setRestoreConfirm]      = useState<Patient | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ search: searchQuery || undefined });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value);
  const handleAddClient    = () => { setSelectedPatient(null); setIsAddModalOpen(true); };
  const handleEditClient   = (patient: Patient) => { setSelectedPatient(patient); setIsEditModalOpen(true); };
  const handleViewClient   = (patient: Patient) => { setSelectedPatient(patient); setIsViewModalOpen(true); };
  const handleFilterClients = () => setIsFilterModalOpen(true);

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setCurrentFilters(newFilters);
    updateFilters({
      gender:    newFilters.gender || undefined,
      is_active: newFilters.is_active !== null ? newFilters.is_active : undefined,
    });
  };

  const handleSavePatient = async (data: CreatePatientData) => {
    try {
      if (isEditModalOpen && selectedPatient) {
        await updatePatient(selectedPatient.id, data);
        toast.success('Client updated successfully');
      } else {
        await createPatient(data);
        toast.success('Client added successfully');
      }
      refresh();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedPatient(null);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to save client';
      toast.error(message);
      throw error;
    }
  };

  const confirmArchive = async () => {
    if (!archiveConfirm) return;
    await handleArchive(archiveConfirm);
    setArchiveConfirm(null);
  };

  const confirmRestore = async () => {
    if (!restoreConfirm) return;
    await handleRestore(restoreConfirm);
    setRestoreConfirm(null);
  };

  const isArchived = view === 'archived';

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">

        {/* ── Page Header ── */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Clients</h1>
              <p className="text-xs text-gray-500">
                Manage your client database and records
                <span className="ml-1 font-medium text-gray-700">({totalCount} {isArchived ? 'archived' : 'total'})</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── View Tabs (Active / Archived) ── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
          <div className="flex gap-1">
            <button
              onClick={() => switchView('active')}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === 'active'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Active Clients
            </button>
            <button
              onClick={() => switchView('archived')}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === 'archived'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived
            </button>
          </div>
        </div>

        {/* ── Search & Actions Bar ── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${isArchived ? 'archived ' : ''}client by name, ID, or phone...`}
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {!isArchived && (
                <>
                  <button
                    onClick={handleFilterClients}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filter</span>
                  </button>
                  <button
                    onClick={handleAddClient}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Client</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Archived banner ── */}
        {isArchived && (
          <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Archived clients and their appointments are <strong>hidden from the diary</strong>.
              Restore a client to make them visible again.
            </p>
          </div>
        )}

        {/* ── Error State ── */}
        {error && (
          <div className="flex-shrink-0 bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-lg">
            <div className="flex items-center gap-3">
              <div className="text-red-700">
                <p className="text-sm font-semibold">Error loading patients</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
              <button
                onClick={refresh}
                className="ml-auto px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Loading State ── */}
        {isLoading && patients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading patients...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <PatientList
              patients={patients}
              currentPage={filters.page || 1}
              totalPages={Math.ceil(totalCount / (filters.page_size || 10))}
              isArchived={isArchived}
              onPageChange={setPage}
              onView={handleViewClient}
              onEdit={handleEditClient}
              onArchive={(p) => setArchiveConfirm(p)}
              onRestore={(p) => setRestoreConfirm(p)}
            />
          </div>
        )}

        {/* ── Filter Modal ── */}
        <PatientFilters
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={handleApplyFilters}
          currentFilters={currentFilters}
        />

        {/* ── Add Patient Modal ── */}
        <PatientModal
          isOpen={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setSelectedPatient(null); }}
          onSave={handleSavePatient}
          mode="create"
        />

        {/* ── Edit Patient Modal ── */}
        <PatientModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedPatient(null); }}
          onSave={handleSavePatient}
          patient={selectedPatient}
          mode="edit"
        />

        {/* ── View Patient Details Modal ── */}
        <PatientDetailsModal
          isOpen={isViewModalOpen}
          onClose={() => { setIsViewModalOpen(false); setSelectedPatient(null); }}
          patient={selectedPatient}
          onEdit={() => { setIsViewModalOpen(false); setIsEditModalOpen(true); }}
        />

        {/* ── Archive Confirm Dialog ── */}
        {archiveConfirm && (
          <ConfirmDialog
            title="Archive Client"
            message={`Archive ${archiveConfirm.full_name}? Their appointments will be hidden from the diary until restored.`}
            confirmLabel="Archive"
            confirmClassName="bg-amber-500 hover:bg-amber-600 text-white"
            icon={<Archive className="w-6 h-6 text-amber-600" />}
            iconBg="bg-amber-100"
            onConfirm={confirmArchive}
            onCancel={() => setArchiveConfirm(null)}
          />
        )}

        {/* ── Restore Confirm Dialog ── */}
        {restoreConfirm && (
          <ConfirmDialog
            title="Restore Client"
            message={`Restore ${restoreConfirm.full_name}? They and their appointments will become visible again.`}
            confirmLabel="Restore"
            confirmClassName="bg-sky-600 hover:bg-sky-700 text-white"
            icon={<ArchiveRestore className="w-6 h-6 text-sky-600" />}
            iconBg="bg-sky-100"
            onConfirm={confirmRestore}
            onCancel={() => setRestoreConfirm(null)}
          />
        )}

      </div>
    </DashboardLayout>
  );
};

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title:            string;
  message:          string;
  confirmLabel:     string;
  confirmClassName: string;
  icon:             React.ReactNode;
  iconBg:           string;
  onConfirm:        () => void;
  onCancel:         () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title, message, confirmLabel, confirmClassName, icon, iconBg, onConfirm, onCancel,
}) => (
  <>
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
            {icon}
          </div>
          <h3 className="text-base font-bold text-gray-900 text-center mb-2">{title}</h3>
          <p className="text-sm text-gray-600 text-center">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  </>
);