import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin must complete clinic setup before accessing any protected page
  if (
    user?.role === 'ADMIN' &&
    user.clinic_setup_complete === false &&
    location.pathname !== '/clinic-setup'
  ) {
    return <Navigate to="/clinic-setup" replace />;
  }

  return <>{children}</>;
};

// ── PublicRoute ────────────────────────────────────────────────────────────────
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    // Redirect admin to setup if not complete
    if (user?.role === 'ADMIN' && user.clinic_setup_complete === false) {
      return <Navigate to="/clinic-setup" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ── RoleBasedRoute ─────────────────────────────────────────────────────────────
export const RoleBasedRoute: React.FC<{
  children:      React.ReactNode;
  allowedRoles:  string[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// ── ClinicMemberRoute ──────────────────────────────────────────────────────────
export const ClinicMemberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user?.clinic) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Same setup guard
  if (
    user.role === 'ADMIN' &&
    user.clinic_setup_complete === false &&
    location.pathname !== '/clinic-setup'
  ) {
    return <Navigate to="/clinic-setup" replace />;
  }

  return <>{children}</>;
};

// ── ClinicSetupRoute ───────────────────────────────────────────────────────────
// Only admins who haven't completed setup can access /clinic-setup
// Anyone else gets redirected
export const ClinicSetupRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Non-admins or already-setup admins → go to dashboard
  if (user?.role !== 'ADMIN' || user.clinic_setup_complete === true) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};