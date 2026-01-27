import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { ProtectedRoute, PublicRoute, RoleBasedRoute } from './router';

// Public Pages
import { LandingPage } from '@/features/landing/LandingPage';
import { Login } from '@/features/auth/Login';
import { AdminRegister } from '@/features/auth/AdminRegister';
import { RegisterSuccess } from '@/features/auth/RegisterSuccess';

// Protected Pages
import { Dashboard } from '@/features/dashboard/Dashboard';

// Placeholder components
const Appointments = () => <div className="p-8"><h1 className="text-2xl font-bold">Appointments</h1></div>;
const Patients = () => <div className="p-8"><h1 className="text-2xl font-bold">Patients</h1></div>;
const Contacts = () => <div className="p-8"><h1 className="text-2xl font-bold">Contacts</h1></div>;
const Reports = () => <div className="p-8"><h1 className="text-2xl font-bold">Reports</h1></div>;
const Manage = () => <div className="p-8"><h1 className="text-2xl font-bold">Manage</h1></div>;
const Setup = () => <div className="p-8"><h1 className="text-2xl font-bold">Setup</h1></div>;
const Profile = () => <div className="p-8"><h1 className="text-2xl font-bold">Profile</h1></div>;

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-red-600">403</h1>
      <p className="text-gray-600 mt-2">You don't have permission to access this page</p>
    </div>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sky-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  const { verifyAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Verify authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      console.log('🚀 App initializing...');
      await verifyAuth();
      setIsInitializing(false);
      console.log('✅ App initialized');
    };

    initAuth();
  }, [verifyAuth]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public Routes - Redirect to dashboard if authenticated */}
        <Route path="/" element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <AdminRegister />
          </PublicRoute>
        } />
        <Route path="/register/success" element={
          <PublicRoute>
            <RegisterSuccess />
          </PublicRoute>
        } />
        
        {/* Unauthorized page */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes - Require authentication */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/appointments" element={
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute>
            <Patients />
          </ProtectedRoute>
        } />
        <Route path="/contacts" element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />
        
        {/* Admin-only routes */}
        <Route path="/manage" element={
          <RoleBasedRoute allowedRoles={['ADMIN']}>
            <Manage />
          </RoleBasedRoute>
        } />
        <Route path="/setup" element={
          <RoleBasedRoute allowedRoles={['ADMIN']}>
            <Setup />
          </RoleBasedRoute>
        } />
        
        {/* Profile - All authenticated users */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        {/* 404 - Redirect based on auth status */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;