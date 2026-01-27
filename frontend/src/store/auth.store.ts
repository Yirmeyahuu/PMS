import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens, AuthState } from '@/types';
import { authService } from '@/services/authService';

interface AuthStore extends AuthState {
  setAuth: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
  verifyAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, tokens) => {
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        localStorage.setItem('user', JSON.stringify(user));
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },
      /**
       * Verify authentication status
       * Called on app initialization
       */
      verifyAuth: async () => {
        console.log('🔐 Verifying authentication...');
        
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
          console.log('❌ No token or user found');
          set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
          return false;
        }
      
        try {
          // Parse user data
          const user = JSON.parse(userStr);
          
          // Verify token with backend
          const response = await authService.verifyToken(token);
          
          if (response.valid && refreshToken) {
            console.log('✅ Token valid, restoring session');
            
            set({
              user,
              tokens: { access: token, refresh: refreshToken },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            console.log('❌ Token invalid or expired');
            get().logout();
            return false;
          }
          
        } catch (error: any) {
          console.error('❌ Auth verification failed:', error);
          
          // Log detailed error for debugging
          if (error.response) {
            console.error('Response error:', error.response.status, error.response.data);
          } else if (error.request) {
            console.error('Request error - no response received');
          } else {
            console.error('Error:', error.message);
          }
          
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);