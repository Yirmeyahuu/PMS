import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import type { PortalPractitioner } from '@/types/portal';

interface PractitionerStepProps {
  practitioners:       PortalPractitioner[];
  selectedPractitioner: PortalPractitioner | null;
  onSelect:            (p: PortalPractitioner) => void;
}

export const PractitionerStep: React.FC<PractitionerStepProps> = ({
  practitioners,
  selectedPractitioner,
  onSelect,
}) => {
  const [search, setSearch] = useState('');

  const filtered = practitioners.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.specialization.toLowerCase().includes(search.toLowerCase()),
  );

  // Unique specializations for filter chips (excluding "Any Available")
  const specializations = Array.from(
    new Set(
      practitioners
        .filter((p) => p.id !== null && p.specialization)
        .map((p) => p.specialization),
    ),
  );

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const displayed = filtered.filter(
    (p) => !activeFilter || p.id === null || p.specialization === activeFilter,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Practitioner</h2>
        <p className="text-gray-500 text-sm mt-1">
          Choose a practitioner or select &quot;Any Available&quot; to let us assign one.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Practitioners..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Specialization filter chips */}
      {specializations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => setActiveFilter(activeFilter === spec ? null : spec)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeFilter === spec
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      )}

      {/* Practitioner grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayed.map((p) => {
          const isSelected = selectedPractitioner?.id === p.id &&
            (p.id !== null || selectedPractitioner?.full_name === p.full_name);
          const isAny = p.id === null;

          return (
            <button
              key={p.id ?? 'any'}
              onClick={() => onSelect(p)}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-center ${
                isSelected
                  ? 'border-teal-500 bg-teal-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
                  isAny ? 'bg-teal-100' : 'bg-gray-200'
                }`}
              >
                {isAny ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-teal-300 border-2 border-white" />
                      <div className="w-7 h-7 rounded-full bg-teal-400 border-2 border-white" />
                      <div className="w-7 h-7 rounded-full bg-teal-500 border-2 border-white" />
                    </div>
                  </div>
                ) : p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>

              {/* Name */}
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-gray-800 leading-tight">
                  {p.full_name}
                </p>
                {p.specialization && (
                  <p className="text-xs text-gray-500">{p.specialization}</p>
                )}
              </div>

              {/* CTA button */}
              <div
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-teal-500 text-white'
                    : isAny
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {isAny ? 'ANY PRACTITIONER' : isSelected ? 'Selected ✓' : 'MORE INFO'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};