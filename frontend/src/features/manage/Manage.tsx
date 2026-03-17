import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ManageNavbar } from './components/ManageNavbar';
import type { ManageCategory } from './types/manage.types';

import { AdminMenu1 } from './pages/administration/PrintAppointments';
import { AdminMenu2 } from './pages/administration/BulkInvoicing';
import { ClinicalMenu1 } from './pages/clinical/ClinicalMenu1';
import { ClinicalMenu2 } from './pages/clinical/ClinicalMenu2';
import { ClinicServices } from './pages/clinical/ClinicServices';
import { ClinicProfile } from './pages/clinical/ClinicProfile';
import { EmailReminder } from './pages/communications/EmailReminder';
import { Records } from './pages/communications/Records';
import { Notifications } from './pages/communications/Notifications';

const MANAGE_CATEGORIES: ManageCategory[] = [
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { id: 'admin1', label: 'Print Appointments', path: 'admin1', component: AdminMenu1 },
      { id: 'admin2', label: 'Bulk Invoicing',     path: 'admin2', component: AdminMenu2 },
    ],
  },
  {
    id: 'clinical',
    label: 'Clinical',
    items: [
      { id: 'clinical1', label: 'Clinic Link Portal',   path: 'clinical1', component: ClinicalMenu1 },
      { id: 'clinical2', label: 'Clinical Templates',   path: 'clinical2', component: ClinicalMenu2 },
      { id: 'clinical3', label: 'Clinic Services',      path: 'clinical3', component: ClinicServices },
      { id: 'clinical4', label: 'Clinic Profile',       path: 'clinical4', component: ClinicProfile },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    items: [
      { id: 'comm1', label: 'Email Reminder', path: 'comm1', component: EmailReminder },
      { id: 'comm2', label: 'Records',        path: 'comm2', component: Records },
      { id: 'comm3', label: 'Notifications',  path: 'comm3', component: Notifications },
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