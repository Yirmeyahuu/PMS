import axios from 'axios';
import type { 
  LoginCredentials, 
  LoginResponse, 
  AdminRegisterData,
  AdminRegisterResponse,
  RegisterData 
} from '@/types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const authService = {
  /**
   * Admin Registration
   */
  async registerAdmin(data: AdminRegisterData): Promise<AdminRegisterResponse> {
    try {
      const response = await authApi.post<AdminRegisterResponse>(
        '/auth/register-admin/',
        data
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { detail: 'Registration failed' };
    }
  },

  /**
   * User Login
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await authApi.post<LoginResponse>('/auth/login/', credentials);
      
      if (response.data.tokens) {
        localStorage.setItem('access_token', response.data.tokens.access);
        localStorage.setItem('refresh_token', response.data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { detail: 'Login failed' };
    }
  },

  /**
   * User Logout
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const accessToken = localStorage.getItem('access_token');
      
      if (refreshToken && accessToken) {
        await authApi.post(
          '/auth/logout/',
          { refresh_token: refreshToken },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
    }
  },

  /**
   * Verify Token
   */
  async verifyToken(token: string): Promise<{ valid: boolean; detail: string }> {
    try {
      const response = await authApi.post('/auth/verify-token/', { token });
      return response.data;
    } catch (error: any) {
      return { valid: false, detail: 'Token verification failed' };
    }
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Get access token
   */
  getAccessToken() {
    return localStorage.getItem('access_token');
  },

  /**
   * Get refresh token
   */
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await authApi.post('/auth/token/refresh/', {
        refresh: refreshToken,
      });
      
      const newAccessToken = response.data.access;
      localStorage.setItem('access_token', newAccessToken);
      
      return newAccessToken;
    } catch (error) {
      this.logout();
      throw error;
    }
  },
};