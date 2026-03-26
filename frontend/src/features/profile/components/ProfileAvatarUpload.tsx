import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';

interface ProfileAvatarUploadProps {
  avatarUrl?:    string | null;
  initials?:     string;  // Optional - can be removed in future
  isUploading:   boolean;
  isRemoving?:   boolean;
  onFileSelect:  (file: File) => void;
  onRemove?:     () => void;
  disabled?:     boolean;  // When true, avatar upload is disabled
}

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_MB   = 5;

export const ProfileAvatarUpload: React.FC<ProfileAvatarUploadProps> = ({
  avatarUrl, isUploading, isRemoving = false, onFileSelect, onRemove, disabled = false,
}) => {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[ProfileAvatarUpload] File selected:', file.name, file.size);

    setError(null);

    if (!file.type.startsWith('image/')) {
      console.warn('[ProfileAvatarUpload] Invalid file type:', file.type);
      setError('Only image files are allowed.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      console.warn('[ProfileAvatarUpload] File too large:', file.size);
      setError(`Image exceeds the ${MAX_MB} MB limit. Please choose a smaller file.`);
      return;
    }

    setPreview(URL.createObjectURL(file));
    onFileSelect(file);
    e.target.value = '';
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onRemove?.();
  };

  const src        = preview ?? avatarUrl ?? null;
  const hasPhoto   = !!src;
  const isBusy     = isUploading || isRemoving || disabled;

  // Default avatar fallback
  const DEFAULT_AVATAR = '/assets/default-avatar/default-profile.jpg';

  return (
    <div className="flex flex-col items-center gap-4">

      {/* ── Avatar circle ── */}
      <div className="relative group">
        <div className="w-36 h-36 rounded-full ring-4 ring-sky-100 overflow-hidden
                        bg-gradient-to-br from-sky-500 to-sky-700
                        flex items-center justify-center shadow-lg">
          {src ? (
            <img src={src} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <img 
              src={DEFAULT_AVATAR} 
              alt="Default Avatar" 
              className="w-full h-full object-cover"
            />
          )}

          {/* Hover overlay — only when not busy */}
          {!isBusy && (
            <div
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 bg-black/45 flex flex-col items-center
                         justify-center opacity-0 group-hover:opacity-100
                         transition-opacity cursor-pointer rounded-full"
            >
              <Camera className="w-8 h-8 text-white mb-1" />
              <span className="text-white text-xs font-semibold tracking-wide">
                {hasPhoto ? 'Change Photo' : 'Upload Photo'}
              </span>
            </div>
          )}

          {/* Uploading spinner */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center
                            justify-center rounded-full gap-1.5">
              <Loader2 className="w-9 h-9 text-white animate-spin" />
              <span className="text-white text-[11px] font-semibold">Uploading…</span>
            </div>
          )}

          {/* Removing spinner */}
          {isRemoving && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center
                            justify-center rounded-full gap-1.5">
              <Loader2 className="w-9 h-9 text-white animate-spin" />
              <span className="text-white text-[11px] font-semibold">Removing…</span>
            </div>
          )}
        </div>

        {/* Camera badge */}
        {!isBusy && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1 right-1 w-10 h-10 bg-sky-600 hover:bg-sky-700
                       rounded-full flex items-center justify-center shadow-lg
                       ring-2 ring-white transition-colors"
            title="Upload photo"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* ── Helper / error text ── */}
      <p className="text-xs text-gray-400 text-center">
        JPG, PNG or WebP · max {MAX_MB} MB
      </p>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200
                        rounded-xl px-4 py-3 max-w-xs">
          <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
          <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Remove Photo button ── */}
      {hasPhoto && !isBusy && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold
                     text-red-500 bg-red-50 hover:bg-red-100 border border-red-200
                     rounded-xl transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove Photo
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};