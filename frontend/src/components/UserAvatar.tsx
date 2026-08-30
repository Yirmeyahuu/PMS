import React, { useState } from 'react';

/**
 * Centralized UserAvatar component for all PMS staff/user avatars.
 *
 * Fallback hierarchy:
 *   1. Uploaded photo (avatar_url or avatar)
 *   2. /users-default-profile/default-profile.jpg  (on null OR on broken image)
 *
 * Never falls back to initials.
 */

const DEFAULT_USER_AVATAR = '/users-default-profile/default-profile.jpg';

/** Resolve a relative avatar path to a full URL for local dev. */
const resolveAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${base}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
};

interface UserAvatarProps {
  /** Full absolute URL or relative path returned by the backend. */
  avatarUrl?: string | null;
  /** Display name — used only for the <img> alt attribute. */
  name?: string;
  /** Tailwind size classes, e.g. "w-9 h-9". Defaults to "w-9 h-9". */
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  className = 'w-9 h-9',
}) => {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveAvatarUrl(avatarUrl);
  const src = resolved && !imgError ? resolved : DEFAULT_USER_AVATAR;

  return (
    <img
      src={src}
      alt={name ? `${name} avatar` : 'User avatar'}
      className={`rounded-full object-cover shrink-0 ${className}`}
      onError={() => setImgError(true)}
    />
  );
};
