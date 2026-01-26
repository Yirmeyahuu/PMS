import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Pin, PinOff, LogOut } from 'lucide-react';
import { sidebarItems } from '../data/sidebarItems';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/authService';
import MESLogo from '@/assets/MESLogo.svg';
import toast from 'react-hot-toast';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: clearAuthState } = useAuthStore();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isExpanded = isPinned || isHovered;

  const handlePinToggle = () => {
    setIsPinned(!isPinned);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    setIsLoggingOut(true);

    try {
      // Call logout API
      await authService.logout();
      
      // Clear auth state
      clearAuthState();
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Redirect to login
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-40 ${
        isExpanded ? 'w-64' : 'w-20'
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sidebar Content */}
      <div className="flex flex-col h-full">
        
        {/* Logo Section */}
        <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center space-x-3 min-w-0">
            <img 
              src={MESLogo} 
              alt="MES Logo" 
              className="h-10 w-10 flex-shrink-0"
            />
            {isExpanded && (
              <span className="text-lg font-bold text-gray-900 truncate">
                MES PMS
              </span>
            )}
          </Link>

          {/* Pin Button - Only show when expanded */}
          {isExpanded && (
            <button
              onClick={handlePinToggle}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {isPinned ? (
                <Pin className="w-5 h-5 text-sky-600" />
              ) : (
                <PinOff className="w-5 h-5 text-gray-400" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-sky-600' : 'text-gray-500'}`} />
                {isExpanded && (
                  <span className={`text-base font-medium truncate ${isActive ? 'text-sky-600' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                )}
                {isExpanded && item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile & Logout Section */}
        <div className="border-t border-gray-200">
          {/* Profile Section */}
          <div className="px-3 py-4 border-b border-gray-200">
            <Link
              to="/profile"
              className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              title={!isExpanded ? user?.first_name || 'Profile' : undefined}
            >
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                alt={user?.first_name || 'User'}
                className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-gray-200"
              />
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.role || 'User'}
                  </p>
                </div>
              )}
              {isExpanded && (
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </Link>
          </div>

          {/* Logout Section */}
          <div className="px-3 py-4">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isExpanded ? 'Logout' : undefined}
            >
              <LogOut className="w-6 h-6 flex-shrink-0" />
              {isExpanded && (
                <span className="text-base font-medium">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hover Indicator - Only show when not pinned */}
      {!isPinned && !isHovered && (
        <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-1 h-12 bg-gray-300 rounded-full opacity-50" />
        </div>
      )}
    </aside>
  );
};