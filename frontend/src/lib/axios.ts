import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Helper: get token from any known storage location ────────────────────────
const getStoredToken = (): string | null => {
  // 1. Direct key (authService.ts stores here)
  const direct = localStorage.getItem('access_token');
  if (direct) return direct;

  // 2. Zustand persisted store (auth.store.ts may persist here)
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const token =
        parsed?.state?.tokens?.access ||
        parsed?.tokens?.access ||
        null;
      if (token) return token;
    }
  } catch {
    // ignore parse errors
  }

  return null;
};

// ─── Request interceptor — attach token ───────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config: any) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ─── Response interceptor — token refresh + 401 handling ─────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken =
          localStorage.getItem('refresh_token') ||
          (() => {
            try {
              const s = localStorage.getItem('auth-storage');
              if (s) {
                const p = JSON.parse(s);
                return p?.state?.tokens?.refresh || p?.tokens?.refresh || null;
              }
            } catch { return null; }
          })();

        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;

          // Persist the new token in both locations
          localStorage.setItem('access_token', newAccessToken);

          // Also update Zustand persisted storage if present
          try {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
              const parsed = JSON.parse(authStorage);
              if (parsed?.state?.tokens) {
                parsed.state.tokens.access = newAccessToken;
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            }
          } catch { /* ignore */ }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed — clear everything and redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;