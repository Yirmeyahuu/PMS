import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pin, PinOff, LogOut, X } from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { sidebarItems } from './sidebarItems';
import MESLogo from '@/assets/Malasakit-Logo-Relicon.webp';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user }  = useAuth();
  const { open: openLogoutConfirm } = useLogoutConfirm();
  const {
    isExpanded,
    isPinned,
    sidebarWidth,
    isMobile,
    isMobileOpen,
    expandSidebar,
    collapseSidebar,
    closeMobileSidebar,
    togglePin,
  } = useSidebar();

  const visibleMenuItems = sidebarItems.filter(item => {
    if (item.adminOnly) return user?.role === 'ADMIN';
    return true;
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) closeMobileSidebar();
  };

  const handleProfileClick = () => {
    navigate('/profile');
    if (isMobile) closeMobileSidebar();
  };

  // ✅ Open confirmation modal instead of direct logout
  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) closeMobileSidebar();
    openLogoutConfirm();
  };

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
          fixed left-0 top-0 h-screen bg-sky-600 border-r border-sky-700 shadow-xl z-50
          transition-all duration-300 ease-in-out overflow-hidden
          ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
        style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}
        onMouseEnter={!isMobile ? expandSidebar : undefined}
        onMouseLeave={!isMobile ? collapseSidebar : undefined}
      >
        <div className="flex flex-col h-full overflow-hidden">

          {/* ── Logo Section ── */}
          <div className="flex-shrink-0 p-4 border-b border-sky-500">
            <div className="flex items-center justify-center gap-3 relative">
              <img
                src={MESLogo}
                alt="MES Logo"
                className={`
                  transition-all duration-300 ease-in-out
                  ${isMobile ? 'w-16 h-16' : (isExpanded ? 'w-20 h-20' : 'w-10 h-10')}
                `}
              />

              {/* Desktop Pin Button */}
              {!isMobile && isExpanded && (
                <button
                  onClick={togglePin}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-lg transition-colors animate-fadeIn"
                  title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                >
                  {isPinned
                    ? <PinOff className="w-4 h-4 text-white" />
                    : <Pin    className="w-4 h-4 text-white/70 hover:text-white" />
                  }
                </button>
              )}

              {/* Mobile Close Button */}
              {isMobile && (
                <button
                  onClick={closeMobileSidebar}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* ── Navigation Items ── */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3">
            <div className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon     = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200 group relative
                      ${isActive
                        ? 'bg-white text-sky-600 shadow-md'
                        : 'text-white hover:bg-white hover:text-sky-600'
                      }
                    `}
                  >
                    <Icon
                      className={`
                        w-5 h-5 flex-shrink-0 transition-colors
                        ${isActive ? 'text-sky-600' : 'text-white group-hover:text-sky-600'}
                      `}
                    />

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

                    {/* Tooltip for collapsed state */}
                    {!isExpanded && !isMobile && (
                      <div className="absolute left-full ml-6 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ── User Section ── */}
          <div className="flex-shrink-0 border-t border-sky-500 bg-sky-700">
            <div
              className={`
                flex items-center gap-3 p-4 min-w-0 relative group
                ${isProfileActive ? 'bg-white/20' : ''}
              `}
            >
              {/* Profile Button */}
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                title="View Profile"
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  transition-all ring-2 ring-white duration-200 overflow-hidden
                  ${isProfileActive
                    ? 'ring-2 ring-white'
                    : 'group-hover:ring-2 group-hover:ring-white/60'
                  }
                `}>
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src="/assets/default-avatar/default-profile.jpg" 
                      alt="Default Profile" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {(isExpanded || isMobile) && (
                  <div className="flex-1 min-w-0 animate-fadeIn text-left">
                    <p className={`
                      font-medium text-sm truncate transition-colors
                      ${isProfileActive ? 'text-white' : 'text-white/90 group-hover:text-white'}
                    `}>
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-sky-200 text-xs truncate">{user?.role}</p>
                  </div>
                )}
              </button>

              {/* Logout Button — sibling, NOT nested inside profile button */}
              {(isExpanded || isMobile) && (
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 group/logout animate-fadeIn"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-white/70 group-hover/logout:text-white" />
                </button>
              )}

              {/* Tooltip for collapsed state */}
              {!isExpanded && !isMobile && (
                <div className="absolute left-full ml-6 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                  View Profile
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};