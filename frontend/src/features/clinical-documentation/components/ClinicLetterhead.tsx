import React from 'react';
import type { ClinicProfile } from '../api/letters.api';

interface ClinicLetterheadProps {
  profile: ClinicProfile | undefined;
}

export const ClinicLetterhead: React.FC<ClinicLetterheadProps> = ({ profile }) => {
  if (!profile) return null;

  return (
    <div className="mb-10 border-b border-slate-800 pb-6 font-sans flex items-center">
      {profile.logo && (
        <img
          src={profile.logo}
          alt={`${profile.name} Logo`}
          className="max-h-24 max-w-[200px] mr-6 object-contain rounded"
        />
      )}
      <div className="flex flex-col justify-center gap-1">
        <h2 className="m-0 text-slate-900 text-xl font-bold tracking-tight uppercase">
          {profile.name}
        </h2>
        <p className="text-slate-700 text-xs m-0">
          {profile.address}
        </p>
        <p className="text-slate-700 text-xs m-0">
          {profile.phone} | {profile.email}
        </p>
      </div>
    </div>
  );
};
