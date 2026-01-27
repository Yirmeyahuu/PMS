import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { useSidebar } from '@/hooks/useSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { sidebarWidth, isMobile } = useSidebar();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Mobile Header */}
      {isMobile && <MobileHeader />}
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area - Full height, no scroll */}
      <main 
        className="transition-all duration-300 ease-in-out h-screen overflow-hidden"
        style={{ 
          marginLeft: isMobile ? '0' : `${sidebarWidth}px`,
          marginTop: isMobile ? '64px' : '0',
          height: isMobile ? 'calc(100vh - 64px)' : '100vh',
        }}
      >
        {children}
      </main>
    </div>
  );
};