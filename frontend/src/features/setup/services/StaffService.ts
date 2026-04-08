import { axiosInstance } from '@/lib/axios';
import type { StaffMember, CreateStaffData } from '../types/staff.types';

/**
 * Get all staff members for the current clinic
 */
export const getStaff = async (): Promise<StaffMember[]> => {
  const response = await axiosInstance.get<{ results: StaffMember[] }>('/users/');
  return response.data.results || [];
};

/**
 * Get single staff member by ID
 */
export const getStaffMember = async (id: number): Promise<StaffMember> => {
  const response = await axiosInstance.get<StaffMember>(`/users/${id}/`);
  return response.data;
};

/**
 * Create new staff member
 * Password is auto-generated and sent via email
 */
export const createStaff = async (data: CreateStaffData): Promise<StaffMember> => {
  console.log('[StaffService] createStaff called', { data });
  console.log('[StaffService] Data being sent:', JSON.stringify(data, null, 2));
  const response = await axiosInstance.post<StaffMember>('/users/', data);
  console.log('[StaffService] Response received:', response.data);
  return response.data;
};

/**
 * Update staff member
 */
export const updateStaff = async (
  id: number,
  data: Partial<CreateStaffData>
): Promise<StaffMember> => {
  console.log('[StaffService] updateStaff called', { id, data });
  console.log('[StaffService] Data being sent:', JSON.stringify(data, null, 2));
  const response = await axiosInstance.patch<StaffMember>(`/users/${id}/`, data);
  console.log('[StaffService] Response received:', response.data);
  console.log('[StaffService] Response availability:', response.data?.availability);
  return response.data;
};

/**
 * Soft delete staff member
 */
export const deleteStaff = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/users/${id}/`);
};

/**
 * Toggle staff member active status
 */
export const toggleStaffStatus = async (
  id: number,
  isActive: boolean
): Promise<StaffMember> => {
  const response = await axiosInstance.patch<StaffMember>(`/users/${id}/`, {
    is_active: isActive,
  });
  return response.data;
};