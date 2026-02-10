import { useState, useEffect, useCallback } from 'react';
import {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffStatus,
} from '../services/staffService';
import type { StaffMember, CreateStaffData } from '../types/staff.types';
import toast from 'react-hot-toast';

export const useStaffManagement = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getStaff();
      // Filter only STAFF and PRACTITIONER roles, exclude ADMIN
      const filteredStaff = data.filter(
        (member) => member.role === 'STAFF' || member.role === 'PRACTITIONER'
      );
      setStaff(filteredStaff);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to load staff members';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleCreateStaff = async (data: CreateStaffData) => {
    try {
      const newStaff = await createStaff(data);
      setStaff((prev) => [...prev, newStaff]);
      toast.success(`Staff member ${newStaff.first_name} ${newStaff.last_name} created successfully!`);
      toast.success('Login credentials have been sent to their email.', {
        duration: 5000,
        icon: '📧',
      });
      return newStaff;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to create staff member';
      toast.error(message);
      throw err;
    }
  };

  const handleUpdateStaff = async (id: number, data: Partial<CreateStaffData>) => {
    try {
      const updated = await updateStaff(id, data);
      setStaff((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success('Staff member updated successfully!');
      return updated;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update staff member';
      toast.error(message);
      throw err;
    }
  };

  const handleDeleteStaff = async (id: number) => {
    try {
      await deleteStaff(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success('Staff member removed successfully!');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to remove staff member';
      toast.error(message);
      throw err;
    }
  };

  const handleToggleStatus = async (id: number, isActive: boolean) => {
    try {
      const updated = await toggleStaffStatus(id, isActive);
      setStaff((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success(`Staff member ${isActive ? 'activated' : 'deactivated'} successfully!`);
      return updated;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update staff status';
      toast.error(message);
      throw err;
    }
  };

  return {
    staff,
    loading,
    error,
    createStaff: handleCreateStaff,
    updateStaff: handleUpdateStaff,
    deleteStaff: handleDeleteStaff,
    toggleStaffStatus: handleToggleStatus,
    refreshStaff: fetchStaff,
  };
};