import { useState, useCallback } from 'react';
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  removeAvatar,
  resetPassword,
  type UpdateProfileData,
} from '../services/profile.api';
import type { User } from '@/types/auth';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export const useProfile = (initialUser: User | null) => {
  const [user,              setUser]              = useState<User | null>(initialUser);
  const [isSaving,          setIsSaving]          = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar,  setIsRemovingAvatar]  = useState(false);
  const [isResettingPw,     setIsResettingPw]     = useState(false);

  /* ── helper: persist user everywhere ── */
  const syncUser = useCallback((updated: User) => {
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    // auth.store exposes updateUser, not setUser
    useAuthStore.getState().updateUser(updated);
  }, []);

  /* ── Refresh from server ── */
  const refresh = useCallback(async () => {
    try {
      const fresh = await getMyProfile();
      syncUser(fresh);
    } catch {
      toast.error('Failed to refresh profile');
    }
  }, [syncUser]);

  /* ── Update profile info ── */
  const saveProfile = useCallback(async (data: UpdateProfileData) => {
    setIsSaving(true);
    try {
      const updated = await updateMyProfile(data);
      syncUser(updated);
      toast.success('Profile updated successfully');
      return true;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        Object.values(err?.response?.data ?? {})?.[0] ||
        'Failed to update profile';
      console.error('saveProfile error:', err?.response?.data ?? err);
      toast.error(String(msg));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [syncUser]);

  /* ── Upload avatar ── */
  const saveAvatar = useCallback(async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      syncUser(updated);
      toast.success('Profile photo updated');
      return true;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        Object.values(err?.response?.data ?? {})?.[0] ||
        'Failed to upload photo';
      console.error('saveAvatar error:', err?.response?.data ?? err);
      toast.error(String(msg));
      return false;
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [syncUser]);

  /* ── Remove avatar ── */
  const deleteAvatar = useCallback(async () => {
    setIsRemovingAvatar(true);
    try {
      const updated = await removeAvatar();
      syncUser(updated);
      toast.success('Profile photo removed');
      return true;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        Object.values(err?.response?.data ?? {})?.[0] ||
        'Failed to remove photo';
      console.error('deleteAvatar error:', err?.response?.data ?? err);
      toast.error(String(msg));
      return false;
    } finally {
      setIsRemovingAvatar(false);
    }
  }, [syncUser]);

  /* ── Reset password ── */
  const doResetPassword = useCallback(async (): Promise<boolean> => {
    setIsResettingPw(true);
    try {
      const refreshToken = localStorage.getItem('refresh_token') ?? undefined;
      const res = await resetPassword({ refresh_token: refreshToken });

      if (res.email_sent) {
        toast.success(
          'New password sent to your email. You will be logged out.',
          { duration: 4000 }
        );
      } else {
        toast.error(res.detail);
        return false;
      }

      setTimeout(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }, 2500);

      return true;
    } catch (err: any) {
      console.error('doResetPassword error:', err?.response?.data ?? err);
      toast.error(err?.response?.data?.detail || 'Password reset failed');
      return false;
    } finally {
      setIsResettingPw(false);
    }
  }, []);

  return {
    user,
    isSaving,
    isUploadingAvatar,
    isRemovingAvatar,
    isResettingPw,
    refresh,
    saveProfile,
    saveAvatar,
    deleteAvatar,
    doResetPassword,
  };
};