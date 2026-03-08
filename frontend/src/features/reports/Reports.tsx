import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { BarChart3 } from 'lucide-react';
import { ReportsNavbar, type ReportTab, type ReportSubMenu } from './components/ReportsNavbar';
import { UninvoicedBookings } from './pages/administration/UninvoicedBookings';
import { Cancellations }      from './pages/administration/Cancellations';
import { ClientCases }        from './pages/clinic/ClientCases';
import { ClinicalNotes }      from './pages/clinic/ClinicalNotes';

const REPORT_DESCRIPTIONS: Record<ReportSubMenu, string> = {
  uninvoiced_bookings: 'Completed bookings that have not yet been invoiced.',
  cancellations:       'Cancelled and no-show appointments in the selected period.',
  clients_cases:       'New client registrations and case bookings with upcoming appointments.',
  clinical_notes:      'Completed appointments without a finalised clinical note.',
};

export const Reports: React.FC = () => {
  const [activeTab,  setActiveTab]  = useState<ReportTab>('administration');
  const [activeMenu, setActiveMenu] = useState<ReportSubMenu>('uninvoiced_bookings');

  const handleNavChange = (tab: ReportTab, menu: ReportSubMenu) => {
    setActiveTab(tab);
    setActiveMenu(menu);
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'uninvoiced_bookings': return <UninvoicedBookings />;
      case 'cancellations':       return <Cancellations />;
      case 'clients_cases':       return <ClientCases />;
      case 'clinical_notes':      return <ClinicalNotes />;
      default:                    return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">

        {/* ── Page Header ── */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reports</h1>
              <p className="text-xs text-gray-500">{REPORT_DESCRIPTIONS[activeMenu]}</p>
            </div>
          </div>
        </div>

        {/* ── Tab + Sub-menu Navigation ── */}
        <ReportsNavbar
          activeTab={activeTab}
          activeMenu={activeMenu}
          onTabChange={handleNavChange}
        />

        {/* ── Report Content ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderContent()}
        </div>

      </div>
    </DashboardLayout>
  );
};