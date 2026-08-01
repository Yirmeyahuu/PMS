import axios from 'axios';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens, AuthState } from '@/types';
import { authService } from '@/services/authService';
import { queryClient } from '@/lib/queryClient';
import { invalidateClinicSettingsCache } from '@/hooks/useClinicSettings';

const AUTH_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/** Attempt a silent access-token refresh. Returns new access token or null on failure. */
async function silentRefresh(): Promise<string | null> {
  const refreshToken =
    localStorage.getItem('refresh_token') ??
    (() => {
      try {
        const s = localStorage.getItem('auth-storage');
        if (s) {
          const p = JSON.parse(s);
          return p?.state?.tokens?.refresh || p?.tokens?.refresh || null;
        }
      } catch { /* ignore */ }
      return null;
    })();

  if (!refreshToken) return null;

  try {
    const res = await axios.post(`${AUTH_API_BASE}/auth/token/refresh/`, { refresh: refreshToken });
    const newAccess: string   = res.data.access;
    const newRefresh: string  = res.data.refresh ?? refreshToken;

    localStorage.setItem('access_token',  newAccess);
    localStorage.setItem('refresh_token', newRefresh);

    // Patch Zustand persisted store
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.tokens) {
          parsed.state.tokens.access  = newAccess;
          parsed.state.tokens.refresh = newRefresh;
          localStorage.setItem('auth-storage', JSON.stringify(parsed));
        }
      }
    } catch { /* ignore */ }

    return newAccess;
  } catch {
    return null;
  }
}

interface AuthStore extends AuthState {
  setAuth: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
  verifyAuth: () => Promise<boolean>;
  /** Fetch the latest user data (including permissions_map) from /auth/me/ and update the store. */
  refreshPermissions: () => Promise<void>;
  /**
   * Increments on every successful permissions refresh.
   * Components that show permission data can watch this to re-fetch when
   * an external session updates permissions via the WebSocket event.
   * Not persisted — resets to 0 on page reload.
   */
  permissionsVersion: number;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
      permissionsVersion: 0,

      setAuth: (user, tokens) => {
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        localStorage.setItem('user', JSON.stringify(user));
        // Reset the inactivity timer when logging in
        localStorage.setItem('last_activity', String(Date.now()));
        // Mark the session as active. sessionStorage is cleared automatically
        // when the browser is closed, ensuring users must log in again.
        sessionStorage.setItem('session_active', '1');
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
        localStorage.removeItem('last_activity');
        sessionStorage.removeItem('session_active');
        // Clear all React Query caches to prevent cross-clinic data leakage
        queryClient.clear();
        // Reset module-level clinic settings cache
        invalidateClinicSettingsCache();
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (user) => {
        // 1. Update standalone 'user' key
        localStorage.setItem('user', JSON.stringify(user));

        // 2. CRITICAL: Also patch the zustand persisted 'auth-storage' key
        //    so that on page refresh, rehydration uses the updated user
        try {
          const raw = localStorage.getItem('auth-storage');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.state = { ...parsed.state, user };
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('Failed to patch auth-storage:', e);
        }

        // 3. Update zustand in-memory state
        set({ user });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      refreshPermissions: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
          const freshUser = await authService.getMe(token);
          get().updateUser(freshUser);
          // Increment version so subscribed components (e.g. Permissions.tsx)
          // know to re-fetch their own data.
          set((state) => ({ permissionsVersion: state.permissionsVersion + 1 }));
          console.debug('🔄 [auth] Permissions refreshed from /auth/me/');
        } catch (err) {
          console.warn('⚠️ [auth] Could not refresh permissions:', err);
        }
      },

      verifyAuth: async () => {
        console.log('🔐 Verifying authentication...');

        // If the browser was closed, sessionStorage is wiped automatically.
        // Absence of the marker means a new browser session — force re-login.
        if (!sessionStorage.getItem('session_active')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
          return false;
        }

        const token        = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        if (!token && !refreshToken) {
          console.log('❌ No credentials found');
          set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
          return false;
        }

        // Resolve a valid access token — refresh silently if expired.
        let activeToken: string | null = token;

        if (token) {
          const tokenCheck = await authService.verifyToken(token);
          if (!tokenCheck.valid) {
            console.log('🔄 Access token expired — attempting silent refresh...');
            activeToken = await silentRefresh();
            if (!activeToken) {
              console.log('❌ Silent refresh failed — logging out');
              get().logout();
              return false;
            }
            console.log('✅ Token silently refreshed');
          }
        } else {
          // No access token but have refresh token — try to obtain new tokens.
          console.log('🔄 No access token — attempting silent refresh...');
          activeToken = await silentRefresh();
          if (!activeToken) {
            console.log('❌ Silent refresh failed — logging out');
            get().logout();
            return false;
          }
        }

        try {
          // ── CRITICAL: Fetch FRESH user data from server ─────────────────
          // This ensures the latest permissions_map is applied even if the
          // admin changed the user's permission group since last login.
          let freshUser: User;
          try {
            freshUser = await authService.getMe(activeToken!);
            console.log('✅ Token valid, session refreshed with latest permissions');
          } catch (meError) {
            // Fallback to cached user only if /auth/me/ is unreachable (offline)
            console.warn('⚠️ Could not refresh user from server, using cached data:', meError);
            const userStr = localStorage.getItem('user');
            if (!userStr) {
              get().logout();
              return false;
            }
            freshUser = JSON.parse(userStr);
          }

          // Sync fresh user to localStorage for subsequent cold-starts
          localStorage.setItem('user', JSON.stringify(freshUser));

          set({
            user: freshUser,
            tokens: {
              access:  activeToken!,
              refresh: localStorage.getItem('refresh_token')!,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          console.error('❌ Auth verification failed:', error);
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