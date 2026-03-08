import React from 'react';
import { ShieldAlert, Building2, FileX, UserX, Users, FileText } from 'lucide-react';

export type ReportTab    = 'administration' | 'clinic';
export type ReportSubMenu =
  | 'uninvoiced_bookings'
  | 'cancellations'
  | 'clients_cases'
  | 'clinical_notes';

interface NavItem {
  id:    ReportSubMenu;
  label: string;
  icon:  React.ReactNode;
  description: string;
}

const TABS: { id: ReportTab; label: string; icon: React.ReactNode; items: NavItem[] }[] = [
  {
    id:    'administration',
    label: 'Administration',
    icon:  <ShieldAlert className="w-4 h-4" />,
    items: [
      {
        id:          'uninvoiced_bookings',
        label:       'Uninvoiced Bookings',
        icon:        <FileX className="w-4 h-4" />,
        description: 'Completed bookings with no invoice',
      },
      {
        id:          'cancellations',
        label:       'Cancellations',
        icon:        <UserX className="w-4 h-4" />,
        description: 'Cancelled & no-show appointments',
      },
    ],
  },
  {
    id:    'clinic',
    label: 'Clinic',
    icon:  <Building2 className="w-4 h-4" />,
    items: [
      {
        id:          'clients_cases',
        label:       'Clients & Cases',
        icon:        <Users className="w-4 h-4" />,
        description: 'New clients and upcoming bookings',
      },
      {
        id:          'clinical_notes',
        label:       'Clinical Notes',
        icon:        <FileText className="w-4 h-4" />,
        description: 'Bookings without finalised notes',
      },
    ],
  },
];

interface ReportsNavbarProps {
  activeTab:    ReportTab;
  activeMenu:   ReportSubMenu;
  onTabChange:  (tab: ReportTab, menu: ReportSubMenu) => void;
}

export const ReportsNavbar: React.FC<ReportsNavbarProps> = ({
  activeTab,
  activeMenu,
  onTabChange,
}) => {
  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200">
      {/* Top-level Tabs */}
      <div className="flex px-6 gap-1 border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id, tab.items[0].id)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-menu items for active tab */}
      {TABS.map((tab) =>
        activeTab === tab.id ? (
          <div key={tab.id} className="flex px-6 gap-1 overflow-x-auto py-1.5">
            {tab.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(tab.id, item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeMenu === item.id
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
};