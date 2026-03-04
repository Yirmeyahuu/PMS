import React, { useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
  Globe, X, Clock, DollarSign, Loader2, AlertCircle,
} from 'lucide-react';
import { useClinicServices } from '../../hooks/useClinicServices';
import { ServiceFormModal } from './components/ServiceFormModal';
import type { ClinicService, ClinicServicePayload } from '../../services/clinic-services.api';

export const ClinicServices: React.FC = () => {
  const {
    services, loading, error,
    createService, updateService, toggleActive, deleteService,
  } = useClinicServices();

  const [search,       setSearch]       = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState<ClinicService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClinicService | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (s: ClinicService) => { setEditing(s); setModalOpen(true); };

  const handleSubmit = async (payload: ClinicServicePayload) => {
    if (editing) {
      await updateService(editing.id, payload);
    } else {
      await createService(payload);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteService(deleteTarget.id, deleteTarget.name);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Generate auto-code (S001, S002…) ─────────────────────────────────────
  const getCode = (index: number) => `S${String(index + 1).padStart(3, '0')}`;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 m-6">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Items &rsaquo; Services
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Clinic Services</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the services your clinic offers. Services marked as &ldquo;Show in Portal&rdquo; are bookable online.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Service
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-16">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-center w-20">Colour</th>
              <th className="px-4 py-3 text-center w-28">Duration</th>
              <th className="px-4 py-3 text-right w-28">Price</th>
              <th className="px-4 py-3 text-center w-24">Portal</th>
              <th className="px-4 py-3 text-center w-20">Active</th>
              <th className="px-4 py-3 text-center w-24">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-gray-400">
                  {search
                    ? 'No services match your search.'
                    : 'No services yet. Click "Create Service" to add one.'}
                </td>
              </tr>
            ) : (
              filtered.map((svc, i) => (
                <tr
                  key={svc.id}
                  className={`hover:bg-gray-50 transition-colors ${!svc.is_active ? 'opacity-50' : ''}`}
                >
                  {/* Code */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {getCode(i)}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(svc)}
                      className="font-medium text-teal-600 hover:underline text-left"
                    >
                      {svc.name}
                    </button>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {svc.description || <span className="text-gray-300">—</span>}
                  </td>

                  {/* Colour */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <div
                        className="w-7 h-7 rounded-md border border-gray-200 shadow-sm"
                        style={{ backgroundColor: svc.color_hex }}
                        title={svc.color_hex}
                      />
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {svc.duration_minutes} mins
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    <div className="flex items-center justify-end gap-0.5">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                      {parseFloat(svc.price).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </td>

                  {/* Portal */}
                  <td className="px-4 py-3 text-center">
                    {svc.show_in_portal ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                        <Globe className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium">
                        <X className="w-3 h-3" /> No
                      </span>
                    )}
                  </td>

                  {/* Active */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(svc.id)}
                      title={svc.is_active ? 'Click to deactivate' : 'Click to activate'}
                      className="inline-flex items-center justify-center"
                    >
                      {svc.is_active ? (
                        <ToggleRight className="w-6 h-6 text-teal-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-300" />
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(svc)}
                        className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(svc)}
                        className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {services.length} service{services.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <ServiceFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Service</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Are you sure you want to delete{' '}
              <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};