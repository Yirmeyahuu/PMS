import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { usePermissions } from '@/hooks/usePermissions';
import { sidebarItems } from './sidebarItems';
import MESLogo from '@/assets/malasakit/Icon - Colored.svg';
import { UserAvatar } from '@/components/UserAvatar';

export const TopNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { open: openLogoutConfirm } = useLogoutConfirm();
  const { isOwner } = usePermissions();

  const visibleMenuItems = sidebarItems.filter((item) => {
    // Legacy adminOnly gate
    if (item.adminOnly && !isOwner) return false;
    return true;
  });

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrator',
    ADMIN_ASSISTANT: 'Admin Assistant',
    PRACTITIONER: 'Practitioner',
    STAFF: 'Staff',
    FINANCE: 'Finance',
    READ_ONLY: 'Read-Only',
  };
  const roleLabel = user?.role ? ROLE_LABELS[user.role] ?? user.role : '';

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    openLogoutConfirm();
  };

  return (
    <>
      {/* ── Fixed Top Navbar ── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-primary-gradient text-white z-50 flex items-center justify-between px-4 shadow-md">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">

          {/* Logo (Clickable to Dashboard) */}
          <button
            onClick={() => handleNavigation('/dashboard')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <img src={MESLogo} alt="Logo" className="w-8 h-8 filter brightness-0 invert" />
            <span className="font-bold text-lg font-heading hidden min-[1440px]:block">Malasakit</span>
          </button>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="flex flex-1 min-w-0 items-center justify-center gap-1 md:gap-2 overflow-x-auto mx-4 scrollbar-hide">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex items-center justify-center gap-1.5 md:gap-2 p-2 md:px-3 lg:px-4 md:py-2 rounded-lg font-medium text-xs lg:text-sm transition-all whitespace-nowrap
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }
                `}
                title={item.label}
              >
                <Icon className={`w-5 h-5 md:w-4 md:h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/80'}`} />
                <span className="hidden md:inline">{item.label}</span>
                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: User Profile */}
        <div className="flex items-center">
          <div className="relative group cursor-pointer" onClick={handleProfileClick}>
            <div className="flex items-center gap-3 hover:bg-white/10 p-1.5 rounded-xl transition-colors">
              <div className="hidden min-[1440px]:block text-right">
                <p className="text-sm font-medium text-white truncate max-w-[120px]">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-white/80">{roleLabel}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                <UserAvatar
                  avatarUrl={user?.avatar_url}
                  name={user ? `${user.first_name} ${user.last_name}` : ''}
                  className="w-9 h-9"
                />
              </div>
            </div>

            {/* Dropdown Menu (Desktop Hover) */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50">
              <div className="p-2">
                <button
                  onClick={handleProfileClick}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

    </>
  );
};
