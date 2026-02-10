import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ManageNavbar } from './components/ManageNavbar';
import type { ManageCategory } from './types/manage.types';


import { AdminMenu1 } from './pages/administration/AdminMenu1';
import { AdminMenu2 } from './pages/administration/AdminMenu2';
import { AdminMenu3 } from './pages/administration/AdminMenu3';
import { ClinicalMenu1 } from './pages/clinical/ClinicalMenu1';
import { ClinicalMenu2 } from './pages/clinical/ClinicalMenu2';
import { ClinicalMenu3 } from './pages/clinical/ClinicalMenu3';
import { CommMenu1 } from './pages/communications/CommMenu1';
import { CommMenu2 } from './pages/communications/CommMenu2';
import { CommMenu3 } from './pages/communications/CommMenu3';
import { DataMenu1 } from './pages/data/DataMenu1';
import { DataMenu2 } from './pages/data/DataMenu2';
import { DataMenu3 } from './pages/data/DataMenu3';

// ...existing MANAGE_CATEGORIES...
const MANAGE_CATEGORIES: ManageCategory[] = [
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { id: 'admin1', label: 'Administration Menu 1', path: 'admin1', component: AdminMenu1 },
      { id: 'admin2', label: 'Administration Menu 2', path: 'admin2', component: AdminMenu2 },
      { id: 'admin3', label: 'Administration Menu 3', path: 'admin3', component: AdminMenu3 },
    ],
  },
  {
    id: 'clinical',
    label: 'Clinical',
    items: [
      { id: 'clinical1', label: 'Clinical Menu 1', path: 'clinical1', component: ClinicalMenu1 },
      { id: 'clinical2', label: 'Clinical Menu 2', path: 'clinical2', component: ClinicalMenu2 },
      { id: 'clinical3', label: 'Clinical Menu 3', path: 'clinical3', component: ClinicalMenu3 },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    items: [
      { id: 'comm1', label: 'Communications Menu 1', path: 'comm1', component: CommMenu1 },
      { id: 'comm2', label: 'Communications Menu 2', path: 'comm2', component: CommMenu2 },
      { id: 'comm3', label: 'Communications Menu 3', path: 'comm3', component: CommMenu3 },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [
      { id: 'data1', label: 'Data Menu 1', path: 'data1', component: DataMenu1 },
      { id: 'data2', label: 'Data Menu 2', path: 'data2', component: DataMenu2 },
      { id: 'data3', label: 'Data Menu 3', path: 'data3', component: DataMenu3 },
    ],
  },
];

export const Manage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('administration');
  const [activeItem, setActiveItem] = useState('admin1');

  const handleItemSelect = (categoryId: string, itemId: string) => {
    setActiveCategory(categoryId);
    setActiveItem(itemId);
  };

  // Find the active component
  const ActiveComponent = MANAGE_CATEGORIES
    .find((cat) => cat.id === activeCategory)
    ?.items.find((item) => item.id === activeItem)?.component;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Floating Manage Navbar */}
        <ManageNavbar
          categories={MANAGE_CATEGORIES}
          activeCategory={activeCategory}
          activeItem={activeItem}
          onItemSelect={handleItemSelect}
        />

        {/* Page Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
          {ActiveComponent ? <ActiveComponent /> : <div>Select a menu item</div>}
        </div>
      </div>
    </DashboardLayout>
  );
};