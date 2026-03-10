import axiosInstance from '@/lib/axios';
import type { User } from '@/types/auth';

export interface UpdateProfileData {
  first_name?: string;
  last_name?:  string;
  phone?:      string;
}

export interface ResetPasswordData {
  refresh_token?: string;
}

export interface ResetPasswordResponse {
  detail:     string;
  email_sent: boolean;
}

/** Get current authenticated user's profile */
export const getMyProfile = async (): Promise<User> => {
  const response = await axiosInstance.get<User>('/auth/me/');
  return response.data;
};

/** Update profile fields (PATCH) — JSON only */
export const updateMyProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await axiosInstance.patch<User>('/users/me/', data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/** Upload avatar — multipart/form-data */
export const uploadAvatar = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await axiosInstance.patch<User>('/users/me/', formData);
  // Let axios set Content-Type with boundary automatically — do NOT set manually
  return response.data;
};

/** Remove avatar — JSON signal to backend */
export const removeAvatar = async (): Promise<User> => {
  const response = await axiosInstance.patch<User>(
    '/users/me/',
    { remove_avatar: true },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
};

/** Reset password — sends new temp password to user's email, forces logout */
export const resetPassword = async (
  data: ResetPasswordData
): Promise<ResetPasswordResponse> => {
  const response = await axiosInstance.post<ResetPasswordResponse>(
    '/auth/reset-password/',
    data
  );
  return response.data;
};