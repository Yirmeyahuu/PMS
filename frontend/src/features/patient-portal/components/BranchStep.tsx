import React, { useState } from 'react';
import { MapPin, Phone, Mail, Building2, CheckCircle, Star, Search } from 'lucide-react';
import type { PortalBranch } from '../types/portal';

interface BranchStepProps {
  branches:       PortalBranch[];
  selectedBranch: PortalBranch | null;
  onSelect:       (branch: PortalBranch) => void;
}

export const BranchStep: React.FC<BranchStepProps> = ({
  branches = [],
  selectedBranch,
  onSelect,
}) => {
  const [search, setSearch] = useState('');

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.city.toLowerCase().includes(search.toLowerCase()) ||
    b.province.toLowerCase().includes(search.toLowerCase()),
  );

  // Main branch always first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_main_branch && !b.is_main_branch) return -1;
    if (!a.is_main_branch && b.is_main_branch) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select a Location</h2>
        <p className="text-gray-500 text-sm mt-1">
          Choose the clinic branch you&apos;d like to visit for your appointment.
        </p>
      </div>

      {/* Search — only show when there are multiple branches */}
      {branches.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city or province…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )}

      {/* Stats bar */}
      {branches.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Building2 className="w-3.5 h-3.5" />
          <span>
            {branches.length} location{branches.length !== 1 ? 's' : ''} available
            {search && ` · ${sorted.length} matching`}
          </span>
        </div>
      )}

      {/* Branch grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-gray-300" />
          </div>
          {search ? (
            <>
              <p className="text-sm font-medium text-gray-500">No locations match &quot;{search}&quot;</p>
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-xs text-teal-600 hover:underline"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">No locations available</p>
              <p className="text-xs text-gray-400 mt-1">Please contact the clinic directly.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((branch) => {
            const isSelected = selectedBranch?.id === branch.id;

            return (
              <button
                key={branch.id}
                onClick={() => onSelect(branch)}
                className={`
                  relative flex flex-col text-left gap-3 p-5 rounded-2xl border-2 transition-all
                  ${isSelected
                    ? 'border-teal-500 bg-teal-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
                  }
                `}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                  </div>
                )}

                {/* Icon + Name + Badge */}
                <div className="flex items-start gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isSelected
                      ? 'bg-teal-500'
                      : branch.is_main_branch
                        ? 'bg-teal-600'
                        : 'bg-teal-100'
                    }
                  `}>
                    <Building2 className={`w-5 h-5 ${
                      isSelected || branch.is_main_branch ? 'text-white' : 'text-teal-600'
                    }`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap pr-6">
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {branch.name}
                      </p>
                      {branch.is_main_branch && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
                          text-[10px] font-semibold bg-teal-100 text-teal-700 flex-shrink-0">
                          <Star className="w-2.5 h-2.5" />
                          Main
                        </span>
                      )}
                    </div>
                    {(branch.city || branch.province) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[branch.city, branch.province].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5">
                  {branch.address && (
                    <div className="flex items-start gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug line-clamp-2">{branch.address}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                      <span className="truncate">{branch.email}</span>
                    </div>
                  )}
                </div>

                {/* CTA strip */}
                <div className={`
                  w-full py-1.5 rounded-lg text-xs font-semibold text-center transition-colors mt-auto
                  ${isSelected
                    ? 'bg-teal-500 text-white'
                    : branch.is_main_branch
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {isSelected ? 'Selected ✓' : 'Select Location'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};