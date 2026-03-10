import React from 'react';
import { UserCircle, BadgeCheck } from 'lucide-react';
import type { User } from '@/types/auth';

const ROLE_META: Record<string, { label: string; color: string }> = {
  ADMIN:        { label: 'Administrator',  color: 'bg-cyan-100    text-cyan-700'   },
  PRACTITIONER: { label: 'Practitioner',   color: 'bg-violet-100  text-violet-700' },
  STAFF:        { label: 'Staff',          color: 'bg-slate-100   text-slate-600'  },
};

interface ProfileHeaderProps {
  user: User;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const meta = ROLE_META[user.role] ?? { label: user.role, color: 'bg-gray-100 text-gray-600' };

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-6 lg:px-8 py-5">
      <div className="max-w-7xl mx-auto flex items-center gap-4">

        {/* Icon */}
        <div className="w-13 h-13 rounded-2xl bg-cyan-600 flex items-center
                        justify-center shadow-md flex-shrink-0 p-2.5">
          <UserCircle className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">My Profile</h1>
          <p className="text-sm text-gray-400 mt-0.5 truncate">
            Manage your personal information and account security
          </p>
        </div>

        {/* Role badge */}
        <span className={`hidden sm:inline-flex items-center gap-2 px-4 py-2
                          rounded-full text-sm font-semibold ${meta.color}`}>
          <BadgeCheck className="w-4 h-4" />
          {meta.label}
        </span>

      </div>
    </div>
  );
};