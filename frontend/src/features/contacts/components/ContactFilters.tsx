import React, { useState, useEffect } from 'react';
import { X, Filter } from 'lucide-react';

interface FilterOptions {
  contact_type: string;
  is_active: boolean | null;
  is_preferred: boolean | null;
}

interface ContactFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export const ContactFilters: React.FC<ContactFiltersProps> = ({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters, isOpen]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      contact_type: '',
      is_active: null,
      is_preferred: null,
    };
    setFilters(resetFilters);
    onApply(resetFilters);
    onClose();
  };

  if (!isOpen) return null;

  const contactTypes = [
    { value: '', label: 'All Types' },
    { value: 'DOCTOR', label: 'Doctor' },
    { value: 'PRACTITIONER', label: 'Practitioner' },
    { value: 'CLINIC', label: 'Clinic' },
    { value: 'LABORATORY', label: 'Laboratory' },
    { value: 'PHARMACY', label: 'Pharmacy' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Filter Contacts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Contact Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Type
              </label>
              <select
                value={filters.contact_type}
                onChange={(e) =>
                  setFilters({ ...filters, contact_type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {contactTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={
                  filters.is_active === null
                    ? ''
                    : filters.is_active
                    ? 'active'
                    : 'inactive'
                }
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    is_active:
                      e.target.value === ''
                        ? null
                        : e.target.value === 'active',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Preferred */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Contacts
              </label>
              <select
                value={
                  filters.is_preferred === null
                    ? ''
                    : filters.is_preferred
                    ? 'preferred'
                    : 'not_preferred'
                }
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    is_preferred:
                      e.target.value === ''
                        ? null
                        : e.target.value === 'preferred',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Contacts</option>
                <option value="preferred">Preferred Only</option>
                <option value="not_preferred">Non-Preferred</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Reset Filters
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};