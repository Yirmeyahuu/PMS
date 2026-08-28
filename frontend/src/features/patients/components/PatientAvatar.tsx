import React, { useState } from 'react';

interface PatientAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  className?: string;
}

const getFullAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${baseUrl}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
};

export const PatientAvatar: React.FC<PatientAvatarProps> = ({ 
  avatarUrl, 
  name, 
  className = 'w-10 h-10' 
}) => {
  const [imgError, setImgError] = useState(false);
  const fallbackSrc = '/patient-default-profile/default-profile.jpg';

  const fullUrl = getFullAvatarUrl(avatarUrl);
  const src = (fullUrl && !imgError) ? fullUrl : fallbackSrc;

  return (
    <img
      src={src}
      alt={name ? `${name} avatar` : 'Patient avatar'}
      className={`rounded-full object-cover shrink-0 ${className}`}
      onError={() => setImgError(true)}
    />
  );
};
