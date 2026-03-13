import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ProtectedRoute, PublicRoute, RoleBasedRoute, ClinicMemberRoute } from './router';
import { LogoutConfirmModal } from '@/components/modals/LogoutConfirmModal';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';

// Public Pages
import { LandingPage }            from '@/features/landing/LandingPage';
import { Login }                  from '@/features/auth/Login';
import { AdminRegister }          from '@/features/auth/AdminRegister';
import { RegisterSuccess }        from '@/features/auth/RegisterSuccess';
import { PortalHome }             from '@/features/patient-portal/pages/PortalHome';
import { BookAppointmentSuccess } from '@/features/patient-portal/pages/BookAppointmentSuccess';

// Protected Pages
import { Dashboard }      from '@/features/dashboard/Dashboard';
import { Diary }          from '@/features/appointments/Diary';
import { Clients }        from '@/features/patients/Clients';
import { Contacts }       from '@/features/contacts/Contacts';
import { Reports }        from '@/features/reports/Reports';
import { Manage }         from '@/features/manage/Manage';
import { Setup }          from '@/features/setup/Setup';
import { Profile }        from '@/features/profile/Profile';
import { PatientProfile } from '@/features/patients/PatientProfile';
import { ClinicMessages } from '@/features/clinic-messages/ClinicMessages';
import { NoteEditor }     from '@/features/clinical-template/pages/NoteEditor';

import { NotificationBell } from '@/features/notifications/NotificationBell';

// ─── Routes where ClinicMessages should NOT appear ────────────────────────────
const PORTAL_PATHS = ['/portal'];

const ClinicMessagesGuard = () => {
  const location = useLocation();
  const isPortal = PORTAL_PATHS.some(path => location.pathname.startsWith(path));
  if (isPortal) return null;
  return <ClinicMessages />;
};

// ── Only show bell for authenticated users, not on portal/login ───────────────
const NotificationBellGuard = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const isPublicPage = ['/login', '/register', '/portal'].some(p =>
    location.pathname.startsWith(p)
  );

  if (!isAuthenticated || isPublicPage) return null;
  return <NotificationBell />;
};

// ─── Global Logout Confirmation Modal ─────────────────────────────────────────
const GlobalLogoutModal = () => {
  const { isOpen, close } = useLogoutConfirm();
  const { logout }        = useAuthStore();

  const handleConfirm = () => {
    close();
    logout();
  };

  return (
    <LogoutConfirmModal
      isOpen={isOpen}
      onConfirm={handleConfirm}
      onCancel={close}
    />
  );
};

// ─── Static pages ──────────────────────────────────────────────────────────────
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

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
  const { verifyAuth }      = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      console.log('🚀 App initializing...');
      await verifyAuth();
      setIsInitializing(false);
      console.log('✅ App initialized');
    };
    initAuth();
  }, [verifyAuth]);

  if (isInitializing) return <LoadingScreen />;

  return (
    <SidebarProvider>
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
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* ── Public ────────────────────────────────────────────────── */}
          <Route path="/"                 element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login"            element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"         element={<PublicRoute><AdminRegister /></PublicRoute>} />
          <Route path="/register/success" element={<PublicRoute><RegisterSuccess /></PublicRoute>} />

          {/* ── Patient Portal — no auth, no clinic messages ──────────── */}
          <Route path="/portal/:token"         element={<PortalHome />} />
          <Route path="/portal/:token/success" element={<BookAppointmentSuccess />} />

          {/* ── Misc ────────────────────────────────────────────────────── */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ── Protected — any authenticated user ────────────────────── */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/diary"     element={<ProtectedRoute><Diary /></ProtectedRoute>} />
          <Route path="/clients"   element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/contacts"  element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="/reports"   element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/patients/:patientId" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />
          <Route path="/clients/:id"         element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />

          {/* ── Clinical Notes ─────────────────────────────────────────── */}
          <Route path="/clinical-notes"         element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
          <Route path="/clinical-notes/:noteId" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />

          {/* ── Manage & Setup — all clinic members (Admin/Staff/Practitioner) ── */}
          <Route path="/manage" element={<ClinicMemberRoute><Manage /></ClinicMemberRoute>} />
          <Route path="/setup"  element={<ClinicMemberRoute><Setup /></ClinicMemberRoute>} />

          {/* ── 404 ─────────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Must be inside <BrowserRouter> to use useLocation() */}
        <ClinicMessagesGuard />

        {/* ── Notification Bell — shown for authenticated users only ── */}
        <NotificationBellGuard />

        {/* Global logout modal */}
        <GlobalLogoutModal />

      </BrowserRouter>
    </SidebarProvider>
  );
}

export default App;