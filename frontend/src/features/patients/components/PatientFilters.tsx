import React, { useState } from 'react';
import { X, Filter } from 'lucide-react';

interface FilterOptions {
  gender: '' | 'M' | 'F' | 'O';
  is_active: boolean | null;
}

interface PatientFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export const PatientFilters: React.FC<PatientFiltersProps> = ({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      gender: '',
      is_active: null,
    };
    setFilters(resetFilters);
    onApply(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Filter Clients</h2>
                <p className="text-sm text-gray-600">Refine your client list</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setFilters({ ...filters, gender: '' })}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${filters.gender === ''
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({ ...filters, gender: 'M' })}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${filters.gender === 'M'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Male
                </button>
                <button
                  onClick={() => setFilters({ ...filters, gender: 'F' })}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${filters.gender === 'F'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Female
                </button>
                <button
                  onClick={() => setFilters({ ...filters, gender: 'O' })}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${filters.gender === 'O'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Other
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFilters({ ...filters, is_active: null })}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${filters.is_active === null
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({ ...filters, is_active: true })}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${filters.is_active === true
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilters({ ...filters, is_active: false })}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${filters.is_active === false
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              Reset Filters
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium"
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