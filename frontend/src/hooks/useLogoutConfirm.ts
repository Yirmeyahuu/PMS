import { create } from 'zustand';

interface LogoutConfirmStore {
  isOpen:  boolean;
  open:    () => void;
  close:   () => void;
}

/**
 * Global store so any component in the tree can trigger
 * the logout confirmation modal without prop drilling.
 */
export const useLogoutConfirm = create<LogoutConfirmStore>(set => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
}));