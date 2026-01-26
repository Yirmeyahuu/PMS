import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
        localStorage.removeItem('auth-storage');
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (user) => {
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
        const token = authService.getAccessToken();
        
        if (!token) {
          set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
          return false;
        }

        try {
          // Verify token with backend
          const response = await authService.verifyToken(token);
          
          if (response.valid) {
            // Token is valid, get user data
            const currentUser = authService.getCurrentUser();
            const refreshToken = authService.getRefreshToken();
            
            if (currentUser && refreshToken) {
              set({
                user: currentUser,
                tokens: { access: token, refresh: refreshToken },
                isAuthenticated: true,
                isLoading: false,
              });
              return true;
            }
          }
          
          // Token invalid, clear auth
          get().logout();
          return false;
          
        } catch (error) {
          console.error('Auth verification failed:', error);
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);