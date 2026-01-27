import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pin, PinOff, LogOut, X } from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuth } from '@/hooks/useAuth';
import { sidebarItems } from './sidebarItems';
import MESLogo from '@/assets/MESLogo.svg';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { 
    isExpanded, 
    isPinned, 
    sidebarWidth,
    isMobile,
    isMobileOpen,
    expandSidebar, 
    collapseSidebar,
    closeMobileSidebar,
    togglePin 
  } = useSidebar();

  // Filter menu items based on user role
  const visibleMenuItems = sidebarItems.filter(item => {
    if (item.adminOnly) {
      return user?.role === 'ADMIN';
    }
    return true;
  });

  const handleNavigation = (path: string) => {
    console.log('🔗 Navigating to:', path);
    navigate(path);
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  const handleProfileClick = () => {
    console.log('👤 Navigating to profile');
    navigate('/profile');
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent profile navigation when clicking logout
    logout();
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  // Mobile Overlay
  const MobileOverlay = isMobile && isMobileOpen && (
    <div 
      className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
      onClick={closeMobileSidebar}
    />
  );

  const isProfileActive = location.pathname === '/profile';

  return (
    <>
      {MobileOverlay}
      
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-xl z-50 
          transition-all duration-300 ease-in-out overflow-hidden
          ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
        style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}
        onMouseEnter={!isMobile ? expandSidebar : undefined}
        onMouseLeave={!isMobile ? collapseSidebar : undefined}
      >
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Logo Section */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200">
            <div className="flex items-center justify-center gap-3 relative">
              {/* Logo - Dynamic Size */}
              <img 
                src={MESLogo} 
                alt="MES Logo" 
                className={`
                  transition-all duration-300 ease-in-out
                  ${isMobile ? 'w-16 h-16' : (isExpanded ? 'w-20 h-20' : 'w-10 h-10')}
                `}
              />
              
              {/* Desktop Pin Button - Absolute positioned */}
              {!isMobile && isExpanded && (
                <button
                  onClick={togglePin}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors animate-fadeIn"
                  title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                >
                  {isPinned ? (
                    <PinOff className="w-4 h-4 text-sky-500" />
                  ) : (
                    <Pin className="w-4 h-4 text-gray-400 hover:text-sky-500" />
                  )}
                </button>
              )}

              {/* Mobile Close Button - Absolute positioned */}
              {isMobile && (
                <button
                  onClick={closeMobileSidebar}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3">
            <div className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200 group relative
                      ${isActive 
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    
                    {(isExpanded || isMobile) && (
                      <span className="font-medium whitespace-nowrap animate-fadeIn truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}

                    {item.badge && (isExpanded || isMobile) && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-fadeIn flex-shrink-0">
                        {item.badge}
                      </span>
                    )}

                    {/* Tooltip for collapsed state (Desktop only) */}
                    {!isExpanded && !isMobile && (
                      <div className="absolute left-full ml-6 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User Section - Clickable Profile */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleProfileClick}
              className={`
                w-full p-4 flex items-center gap-3 min-w-0 
                transition-all duration-200 hover:bg-gray-100 group
                ${isProfileActive ? 'bg-sky-50' : ''}
              `}
              title="View Profile"
            >
              {/* Avatar */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                transition-all duration-200
                ${isProfileActive 
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 ring-2 ring-sky-300' 
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 group-hover:ring-2 group-hover:ring-sky-200'
                }
              `}>
                <span className="text-white font-bold text-sm">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              
              {/* User Info - Only show when expanded */}
              {(isExpanded || isMobile) && (
                <>
                  <div className="flex-1 min-w-0 animate-fadeIn text-left">
                    <p className={`
                      font-medium text-sm truncate transition-colors
                      ${isProfileActive ? 'text-sky-700' : 'text-gray-900 group-hover:text-gray-900'}
                    `}>
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {user?.role}
                    </p>
                  </div>
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 group/logout animate-fadeIn"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 text-gray-500 group-hover/logout:text-red-500" />
                  </button>
                </>
              )}

              {/* Tooltip for collapsed state (Desktop only) */}
              {!isExpanded && !isMobile && (
                <div className="absolute left-full ml-6 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                  View Profile
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};