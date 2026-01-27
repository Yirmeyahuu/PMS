import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SidebarContextType {
  isExpanded: boolean;
  isPinned: boolean;
  isMobileOpen: boolean;
  sidebarWidth: number;
  isMobile: boolean;
  expandSidebar: () => void;
  collapseSidebar: () => void;
  togglePin: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_WIDTH = {
  COLLAPSED: 80,
  EXPANDED: 280,
  MOBILE: 280,
};

const MOBILE_BREAKPOINT = 768; // md breakpoint

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const expandSidebar = useCallback(() => {
    if (!isMobile) {
      setIsExpanded(true);
    }
  }, [isMobile]);

  const collapseSidebar = useCallback(() => {
    if (!isPinned && !isMobile) {
      setIsExpanded(false);
    }
  }, [isPinned, isMobile]);

  const togglePin = useCallback(() => {
    setIsPinned(prev => {
      const newPinned = !prev;
      // When pinning, ensure sidebar is expanded
      if (newPinned) {
        setIsExpanded(true);
      }
      return newPinned;
    });
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const sidebarWidth = isMobile 
    ? SIDEBAR_WIDTH.MOBILE 
    : (isExpanded ? SIDEBAR_WIDTH.EXPANDED : SIDEBAR_WIDTH.COLLAPSED);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        isPinned,
        isMobileOpen,
        sidebarWidth,
        isMobile,
        expandSidebar,
        collapseSidebar,
        togglePin,
        toggleMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within SidebarProvider');
  }
  return context;
};