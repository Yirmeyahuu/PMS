import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PatientList } from './PatientList';
import { PatientFilters } from './components/PatientFilters';
import { PatientModal } from './components/PatientModal';
import { PatientDetailsModal } from './components/PatientDetailsModal';
import { Users, Plus, Filter, Search, Loader2 } from 'lucide-react';
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
    updateFilters, 
    setPage,
    refresh 
  } = usePatients();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    gender: '',
    is_active: null,
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

  const handleAddClient = () => {
    setSelectedPatient(null);
    setIsAddModalOpen(true);
  };

  const handleEditClient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsEditModalOpen(true);
  };

  const handleViewClient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewModalOpen(true);
  };

  const handleFilterClients = () => {
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setCurrentFilters(newFilters);
    
    updateFilters({
      gender: newFilters.gender || undefined,
      is_active: newFilters.is_active !== null ? newFilters.is_active : undefined,
    });
  };

  const handleSavePatient = async (data: CreatePatientData) => {
    try {
      if (isEditModalOpen && selectedPatient) {
        // Update existing patient
        await updatePatient(selectedPatient.id, data);
        toast.success('Client updated successfully');
      } else {
        // Create new patient
        await createPatient(data);
        toast.success('Client added successfully');
      }
      
      // Refresh the patient list
      refresh();
      
      // Close modal
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedPatient(null);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to save client';
      toast.error(message);
      throw error; // Re-throw to let modal handle it
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Clients</h1>
                <p className="text-sm text-gray-600">
                  Manage your client database and records ({totalCount} total)
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
                placeholder="Search Client by name, id, or phone..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleFilterClients}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Filter className="w-5 h-5" />
                <span className="hidden sm:inline">Filter Clients</span>
              </button>
              <button
                onClick={handleAddClient}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Client</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex-shrink-0 bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex items-center gap-3">
              <div className="text-red-700">
                <p className="font-medium">Error loading patients</p>
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
        {isLoading && patients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading patients...</p>
            </div>
          </div>
        ) : (
          /* Patient List */
          <div className="flex-1 overflow-hidden">
            <PatientList 
              patients={patients}
              currentPage={filters.page || 1}
              totalPages={Math.ceil(totalCount / (filters.page_size || 10))}
              onPageChange={setPage}
              onView={handleViewClient}
              onEdit={handleEditClient}
            />
          </div>
        )}

        {/* Filter Modal */}
        <PatientFilters
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={handleApplyFilters}
          currentFilters={currentFilters}
        />

        {/* Add Patient Modal */}
        <PatientModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedPatient(null);
          }}
          onSave={handleSavePatient}
          mode="create"
        />

        {/* Edit Patient Modal */}
        <PatientModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPatient(null);
          }}
          onSave={handleSavePatient}
          patient={selectedPatient}
          mode="edit"
        />

        {/* View Patient Details Modal */}
        <PatientDetailsModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPatient(null);
          }}
          patient={selectedPatient}
          onEdit={() => {
            setIsViewModalOpen(false);
            setIsEditModalOpen(true);
          }}
        />
      </div>
    </DashboardLayout>
  );
};