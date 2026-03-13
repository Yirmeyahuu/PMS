import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

/**
 * ProtectedRoute - Requires authentication
 * Redirects to login if not authenticated
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * PublicRoute - Only for non-authenticated users
 * Always redirects to /dashboard if already authenticated
 */
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * RoleBasedRoute - Requires specific role(s)
 * Redirects to unauthorized if user doesn't have required role
 */
interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * ClinicMemberRoute - Requires user to belong to a clinic (any role)
 * All clinic users (Admin, Staff, Practitioner) are allowed.
 * Redirects to unauthorized if user has no clinic assigned.
 */
export const ClinicMemberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Must have a clinic assigned — guards against superusers or orphaned accounts
  if (!user?.clinic) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};