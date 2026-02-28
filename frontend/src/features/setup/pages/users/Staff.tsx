import React, { useState } from 'react';
import { Users, UserPlus, RefreshCw, Search } from 'lucide-react';
import { StaffTable } from './components/StaffTable';
import { CreateStaffAccountModal } from '../../components/modals/CreateStaffAccountModal';
import { useStaffManagement } from '../../hooks/useStaffManagement';
import type { CreateStaffData, StaffMember } from '../../types/staff.types';

export const Staff: React.FC = () => {
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedStaff, setSelectedStaff]   = useState<StaffMember | null>(null);

  const {
    staff,
    loading,
    error,
    createStaff,
    updateStaff,
    deleteStaff,
    toggleStaffStatus,
    refreshStaff,
  } = useStaffManagement();

  const handleCreateStaff = async (data: CreateStaffData) => {
    await createStaff(data);
  };

  const handleEditStaff = async (data: CreateStaffData) => {
    if (!selectedStaff) return;
    await updateStaff(selectedStaff.id, data);
  };

  const handleModalSubmit = async (data: CreateStaffData) => {
    if (selectedStaff) {
      await handleEditStaff(data);
    } else {
      await handleCreateStaff(data);
    }
  };

  const handleEdit = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteStaff(id);
  };

  const handleToggleStatus = async (id: number, isActive: boolean) => {
    await toggleStaffStatus(id, isActive);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedStaff(null);
  };

  // Filter staff based on search query
  const filteredStaff = staff.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.position ?? '').toLowerCase().includes(q) ||
      (s.clinic_branch_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Staff Management</h2>
                <p className="text-white/90">
                  Manage staff members and practitioners in your practice
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedStaff(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-teal-600 rounded-lg font-semibold hover:bg-white/90 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Create Staff Member
            </button>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, position, or branch..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{filteredStaff.length}</span>{' '}
              staff member{filteredStaff.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={refreshStaff}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Staff Table */}
        <div className="px-6 pb-6">
          <StaffTable
            staff={filteredStaff}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </div>

      {/* Create / Edit Staff Modal */}
      <CreateStaffAccountModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        editingStaff={selectedStaff}
      />
    </div>
  );
};