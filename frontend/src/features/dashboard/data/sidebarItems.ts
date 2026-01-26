import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Contact, 
  BarChart3, 
  FolderKanban, 
  Settings 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: string;
}

export const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'diary',
    label: 'Diary',
    icon: Calendar,
    path: '/appointments'
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    path: '/patients'
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Contact,
    path: '/contacts'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports'
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: FolderKanban,
    path: '/manage'
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: Settings,
    path: '/setup'
  }
];