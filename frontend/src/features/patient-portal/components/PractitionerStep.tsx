import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import type { PortalPractitioner } from '../types/portal';

// ── Discipline label map (mirrors DISCIPLINE_OPTIONS in staff.types.ts) ───────
const DISCIPLINE_LABELS: Record<string, string> = {
  OCCUPATIONAL_THERAPY:        'Occupational Therapy',
  SPEECH_LANGUAGE_PATHOLOGIST: 'Speech Language Pathologist',
  PHYSICAL_THERAPY:            'Physical Therapy',
  OSTEOPATHY:                  'Osteopathy',
  DENTISTRY:                   'Dentistry',
  MD_GENERAL_PRACTITIONER:     'MD: General Practitioner',
};

const getDisciplineLabel = (d?: string | null): string | null => {
  if (!d) return null;
  return DISCIPLINE_LABELS[d] ?? d; // fallback to raw value if unknown
};

interface PractitionerStepProps {
  practitioners:        PortalPractitioner[];
  selectedPractitioner: PortalPractitioner | null;
  onSelect:             (p: PortalPractitioner) => void;
}

export const PractitionerStep: React.FC<PractitionerStepProps> = ({
  practitioners,
  selectedPractitioner,
  onSelect,
}) => {
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ── Unique disciplines for filter chips (real practitioners only) ────────
  const disciplines = Array.from(
    new Set(
      practitioners
        .filter((p) => p.id !== null && p.discipline)
        .map((p) => p.discipline as string),
    ),
  );

  const filtered = practitioners.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q)                              ||
      (p.occupation  ?? '').toLowerCase().includes(q)                    ||
      (p.position    ?? '').toLowerCase().includes(q)                    ||
      (getDisciplineLabel(p.discipline) ?? '').toLowerCase().includes(q) ||
      (p.specialization ?? '').toLowerCase().includes(q)
    );
  });

  const displayed = filtered.filter(
    (p) => !activeFilter || p.id === null || p.discipline === activeFilter,
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
          placeholder="Search by name, position or discipline..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Discipline filter chips */}
      {disciplines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {disciplines.map((disc) => (
            <button
              key={disc}
              onClick={() => setActiveFilter(activeFilter === disc ? null : disc)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeFilter === disc
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
              }`}
            >
              {getDisciplineLabel(disc)}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <User className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">
            {search ? 'No practitioners match your search.' : 'No practitioners available at this location.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-xs text-teal-600 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Practitioner grid */}
      {displayed.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayed.map((p) => {
            const isSelected =
              selectedPractitioner?.id === p.id &&
              (p.id !== null || selectedPractitioner?.full_name === p.full_name);
            const isAny           = p.id === null;
            const disciplineLabel = getDisciplineLabel(p.discipline);

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
                    isAny ? 'bg-teal-100' : 'bg-gray-100'
                  }`}
                >
                  {isAny ? (
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-teal-300 border-2 border-white" />
                      <div className="w-7 h-7 rounded-full bg-teal-400 border-2 border-white" />
                      <div className="w-7 h-7 rounded-full bg-teal-500 border-2 border-white" />
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

                {/* Info block */}
                <div className="w-full space-y-1">

                  {/* 1. Name (with title if present) */}
                  <p className={`text-sm font-bold leading-tight ${
                    isSelected ? 'text-teal-800' : 'text-gray-900'
                  }`}>
                    {!isAny && p.title ? `${p.title}. ${p.full_name}` : p.full_name}
                  </p>

                  {/* 2. Occupation / Position */}
                  {!isAny && (p.occupation || p.position) && (
                    <p className={`text-xs font-semibold ${
                      isSelected ? 'text-teal-600' : 'text-gray-600'
                    }`}>
                      {p.occupation || p.position}
                    </p>
                  )}

                  {/* 3. Discipline — pill badge */}
                  {!isAny && disciplineLabel && (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium leading-snug ${
                      isSelected
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {disciplineLabel}
                    </span>
                  )}

                  {/* Fallback: specialization only if no occupation/discipline */}
                  {!isAny && !p.occupation && !p.position && !disciplineLabel && p.specialization && (
                    <p className="text-xs text-gray-500">{p.specialization}</p>
                  )}
                </div>

                {/* CTA button */}
                <div className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-teal-500 text-white'
                    : isAny
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}>
                  {isAny ? 'ANY PRACTITIONER' : isSelected ? 'Selected ✓' : 'Select'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};