import React, { useState } from 'react';
import {
  MapPin, Plus, Building2, Phone, Mail, Star, Edit,
  MoreVertical, CheckCircle, XCircle, Globe, Loader2,
  Hash,
} from 'lucide-react';
import { useClinicBranches } from '@/features/clinics/hooks/useClinicBranches';
import { createClinicBranch, updateClinicBranch } from '@/features/clinics/clinic.api';
import { CreateBranchModal } from './components/CreateBranchModal';
import type { ClinicBranch, CreateBranchData } from '@/types/clinic';
import toast from 'react-hot-toast';

// ─── BranchCard ───────────────────────────────────────────────────────────────

interface BranchCardProps {
  branch: ClinicBranch;
  onEdit: (branch: ClinicBranch) => void;
}

const BranchCard: React.FC<BranchCardProps> = ({ branch, onEdit }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
      branch.is_main_branch ? 'border-sky-300' : 'border-gray-200'
    }`}>
      <div className={`h-1 ${branch.is_main_branch ? 'bg-sky-500' : 'bg-gray-200'}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              branch.is_main_branch ? 'bg-sky-100' : 'bg-gray-100'
            }`}>
              <Building2 className={`w-5 h-5 ${branch.is_main_branch ? 'text-sky-600' : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900 truncate">{branch.name}</h3>
                {branch.is_main_branch && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex-shrink-0">
                    <Star className="w-3 h-3 fill-sky-500 text-sky-500" />
                    Main Branch
                  </span>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-medium mt-0.5 ${
                branch.is_active ? 'text-green-600' : 'text-gray-400'
              }`}>
                {branch.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {branch.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Action menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                  <button
                    onClick={() => { onEdit(branch); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-sky-500" />
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Branch ID pill */}
        {branch.branch_code && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
              <Hash className="w-3 h-3 text-gray-400" />
              {branch.branch_code}
            </span>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2">
          {(branch.address || branch.city) && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>
                {[branch.address, branch.city, branch.province, branch.postal_code]
                  .filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>{branch.phone}</span>
            </div>
          )}
          {branch.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>{branch.email}</span>
            </div>
          )}
          {branch.website && (
            <div className="flex items-center gap-2 text-xs text-sky-600">
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              <a href={branch.website} target="_blank" rel="noreferrer" className="hover:underline truncate">
                {branch.website}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
        <button
          onClick={() => onEdit(branch)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit Details
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const PracticeOption1: React.FC = () => {
  const { branches, mainClinicId, loading, refetch } = useClinicBranches();

  const [modalOpen, setModalOpen]         = useState(false);
  const [editingBranch, setEditingBranch] = useState<ClinicBranch | null>(null);
  const [saving, setSaving]               = useState(false);

  const mainClinic     = branches.find((b) => b.is_main_branch);
  const mainClinicName = mainClinic?.name ?? '';

  const total    = branches.length;
  const active   = branches.filter((b) => b.is_active).length;
  const inactive = branches.filter((b) => !b.is_active).length;

  const handleOpenCreate = () => { setEditingBranch(null); setModalOpen(true); };
  const handleOpenEdit   = (branch: ClinicBranch) => { setEditingBranch(branch); setModalOpen(true); };

  const handleSave = async (data: CreateBranchData) => {
    setSaving(true);
    try {
      if (editingBranch) {
        await updateClinicBranch(editingBranch.id, data);
        toast.success('Branch updated successfully');
      } else {
        if (!mainClinicId) throw new Error('No main clinic found');
        await createClinicBranch(mainClinicId, data);
        toast.success('Branch created successfully');
      }
      await refetch();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.name?.[0] ||
        'Failed to save branch'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="p-6 space-y-5">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Clinic Locations</h2>
              <p className="text-xs text-gray-500">Manage your clinic branches and locations</p>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Branch
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Locations', value: total,    color: 'text-gray-900',  bg: 'bg-white',    border: 'border-gray-200'  },
            { label: 'Active',          value: active,   color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
            { label: 'Inactive',        value: inactive, color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200'   },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Branch Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Building2 className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No locations yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Add your first clinic branch to get started</p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Branch
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...branches]
              .sort((a, b) => Number(b.is_main_branch) - Number(a.is_main_branch))
              .map((branch) => (
                <BranchCard key={branch.id} branch={branch} onEdit={handleOpenEdit} />
              ))}
          </div>
        )}
      </div>

      {/* ── Modal — rendered outside the page div to avoid layout interference ── */}
      <CreateBranchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        branch={editingBranch}
        mode={editingBranch ? 'edit' : 'create'}
        saving={saving}
        mainClinicName={mainClinicName}
      />
    </>
  );
};