import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Contact, 
  BarChart3, 
  FolderCog, 
  Settings
} from 'lucide-react';

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  badge?: number;
  adminOnly?: boolean;
}

export const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'diary',
    label: 'Diary',
    path: '/diary',
    icon: Calendar,
  },
  {
    id: 'clients',
    label: 'Clients',
    path: '/clients',
    icon: Users,
  },
  {
    id: 'contacts',
    label: 'Contacts',
    path: '/contacts',
    icon: Contact,
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
  },
  {
    id: 'manage',
    label: 'Manage',
    path: '/manage',
    icon: FolderCog,
    adminOnly: true,
  },
  {
    id: 'setup',
    label: 'Setup',
    path: '/setup',
    icon: Settings,
    adminOnly: true,
  },
];