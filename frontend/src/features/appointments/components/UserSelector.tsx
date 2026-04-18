import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, Search, X, User } from 'lucide-react';
import type { ClinicUser } from '../hooks/useClinicUsers';

interface UserSelectorProps {
  users: ClinicUser[];
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[]) => void;
  disabled?: boolean;
  error?: string;
}

// Helper to get avatar URL - handles both Cloudinary and local media
const getAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  
  // If already a full URL (Cloudinary in production), return as-is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // Local development: prepend backend base URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${baseUrl}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
};

// Avatar component with fallback to initials
const UserAvatar: React.FC<{ user: ClinicUser; size?: 'sm' | 'md' }> = ({ user, size = 'md' }) => {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = getAvatarUrl(user.avatar);
  
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  if (!avatarUrl || imageError) {
    // Fallback to initials
    return (
      <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-semibold shrink-0`}>
        {getInitials(user.name)}
      </div>
    );
  }
  
  return (
    <img
      src={avatarUrl}
      alt={user.name}
      onError={() => setImageError(true)}
      className={`${sizeClasses} rounded-full object-cover shrink-0 border-2 border-white shadow-sm`}
    />
  );
};

interface UserSelectorProps {
  users: ClinicUser[];
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[]) => void;
  disabled?: boolean;
  error?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  users,
  selectedUserIds,
  onSelectionChange,
  disabled = false,
  error,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFocused]);

  // Filter users based on search query (name or role/discipline)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const toggleUser = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUserIds, userId]);
    }
  };

  const selectAll = () => {
    // Select all filtered users
    const allFilteredIds = filteredUsers.map(u => u.id);
    const newSelection = [...new Set([...selectedUserIds, ...allFilteredIds])];
    onSelectionChange(newSelection);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const clearSearch = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search by name or role..."
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2.5 rounded-lg border transition-colors
            focus:ring-2 focus:ring-offset-1 focus:outline-none
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-sky-500 focus:ring-sky-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
          `}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}

      {/* Selected Count Badge with Avatars */}
      {selectedUserIds.length > 0 && (
        <div className="mt-2 flex items-center gap-3">
          {/* Selected user avatars (show max 3, then +N) */}
          <div className="flex -space-x-2">
            {selectedUserIds.slice(0, 3).map(userId => {
              const user = users.find(u => u.id === userId);
              if (!user) return null;
              return (
                <div key={userId} className="ring-2 ring-white rounded-full">
                  <UserAvatar user={user} size="sm" />
                </div>
              );
            })}
            {selectedUserIds.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 ring-2 ring-white">
                +{selectedUserIds.length - 3}
              </div>
            )}
          </div>
          
          {/* Count and clear button */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">
              {selectedUserIds.length} selected
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* User List - Show when focused or has search query */}
      {(isFocused || searchQuery) && (
        <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
          {/* Header with actions */}
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-xs font-medium text-gray-600">
              {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'} found
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-sky-600 hover:text-sky-700 font-medium"
              disabled={filteredUsers.length === 0}
            >
              Select All
            </button>
          </div>

          {/* User List - Scrollable with max 3-4 users visible */}
          <div className="overflow-y-auto max-h-64">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700">No users found</p>
                <p className="text-xs text-gray-500 mt-1">
                  Try searching by name or role (Admin, Practitioner, Staff)
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className={`
                      w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors
                      flex items-center gap-3 border-b border-gray-100 last:border-b-0
                      ${isSelected ? 'bg-sky-50' : ''}
                    `}
                  >
                    {/* Avatar */}
                    <UserAvatar user={user} size="md" />
                    
                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                        <span className={`
                          text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0
                          ${user.role === 'ADMIN'
                            ? 'bg-rose-100 text-rose-700'
                            : user.role === 'PRACTITIONER'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                          }
                        `}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    
                    {/* Checkmark */}
                    {isSelected && (
                      <div className="shrink-0 w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
