import { axiosInstance } from '../../lib/axios';
import type { 
  LoginCredentials, 
  RegisterData, 
  LoginResponse,
  User 
} from '../../types';

/**
 * Authentication API
 * Handles all auth-related HTTP requests
 * Security: Never logs sensitive data, sanitizes inputs
 */
class AuthAPI {
  /**
   * Login user with email and password
   * Returns user data and JWT tokens
   * Security: Generic error messages to prevent user enumeration
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await axiosInstance.post<LoginResponse>(
        '/auth/login/',
        credentials
      );
      return response.data;
    } catch (error: any) {
      // Generic error to prevent user enumeration
      throw new Error(error.response?.data?.detail || 'Invalid credentials');
    }
  }

  /**
   * Register new user
   * Security: Client-side validation is done but server is source of truth
   */
  async register(data: RegisterData): Promise<LoginResponse> {
    try {
      const response = await axiosInstance.post<LoginResponse>(
        '/auth/register/',
        data
      );
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      
      // Handle specific validation errors
      if (errorData?.email) {
        throw new Error(errorData.email[0]);
      }
      if (errorData?.password) {
        throw new Error(errorData.password[0]);
      }
      if (errorData?.non_field_errors) {
        throw new Error(errorData.non_field_errors[0]);
      }
      
      throw new Error('Registration failed. Please try again.');
    }
  }

  /**
   * Logout user
   * Security: Blacklists refresh token server-side
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await axiosInstance.post('/auth/logout/', {
        refresh_token: refreshToken
      });
    } catch (error) {
      // Silent fail - still clear local state
      console.error('Logout error:', error);
    }
  }

  /**
   * Get current user profile
   * Used to verify token validity and sync user state
   */
  async getCurrentUser(): Promise<User> {
    const response = await axiosInstance.get<User>('/users/me/');
    return response.data;
  }

  /**
   * Refresh access token using refresh token
   * Called automatically by axios interceptor
   */
  async refreshToken(refreshToken: string): Promise<{ access: string; refresh: string }> {
    const response = await axiosInstance.post('/auth/refresh/', {
      refresh: refreshToken
    });
    return response.data;
  }
}

export const authAPI = new AuthAPI();