import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { BarChart3, ChevronRight, ArrowLeft } from 'lucide-react';
import { UninvoicedBookings } from './pages/administration/UninvoicedBookings';
import { Cancellations }      from './pages/administration/Cancellations';
import { ClientCases }        from './pages/clinic/ClientCases';
import { ClinicalNotes }      from './pages/clinic/ClinicalNotes';
import { InventoryItems }     from './pages/financials/InventoryItems';
import { AppointmentCosts }   from './pages/financials/AppointmentCosts';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportMenu =
  | 'uninvoiced_bookings'
  | 'cancellations'
  | 'clients_cases'
  | 'clinical_notes'
  | 'inventory_items'
  | 'appointment_costs';

interface MenuItem {
  id:    ReportMenu;
  label: string;
}

interface SectionCard {
  title:     string;
  items:     MenuItem[];
  cardBg:    string;
  titleColor: string;
  rowOdd:    string;
  rowEven:   string;
  rowHover:  string;
}

// ─── Card / menu data ─────────────────────────────────────────────────────────

const CARDS: SectionCard[] = [
  {
    title:      'Administration',
    cardBg:     'bg-orange-50 border border-orange-200',
    titleColor: 'text-orange-700',
    rowOdd:     'bg-orange-100',
    rowEven:    'bg-white',
    rowHover:   'hover:bg-orange-200 hover:text-orange-800',
    items: [
      { id: 'uninvoiced_bookings', label: 'Uninvoiced Bookings' },
      { id: 'cancellations',       label: 'Cancellations'       },
    ],
  },
  {
    title:      'Clinic',
    cardBg:     'bg-blue-50 border border-blue-200',
    titleColor: 'text-blue-700',
    rowOdd:     'bg-blue-100',
    rowEven:    'bg-white',
    rowHover:   'hover:bg-blue-200 hover:text-blue-800',
    items: [
      { id: 'clients_cases',  label: 'Clients & Cases' },
      { id: 'clinical_notes', label: 'Clinical Notes'  },
    ],
  },
  {
    title:      'Financial',
    cardBg:     'bg-green-50 border border-green-200',
    titleColor: 'text-green-700',
    rowOdd:     'bg-green-100',
    rowEven:    'bg-white',
    rowHover:   'hover:bg-green-200 hover:text-green-800',
    items: [
      { id: 'inventory_items',   label: 'Inventory Items'   },
      { id: 'appointment_costs', label: 'Appointment Costs' },
    ],
  },
];

const REPORT_LABELS: Record<ReportMenu, string> = {
  uninvoiced_bookings: 'Uninvoiced Bookings',
  cancellations:       'Cancellations',
  clients_cases:       'Clients & Cases',
  clinical_notes:      'Clinical Notes',
  inventory_items:     'Inventory Items',
  appointment_costs:   'Appointment Costs',
};

const SECTION_FOR_MENU: Record<ReportMenu, string> = {
  uninvoiced_bookings: 'Administration',
  cancellations:       'Administration',
  clients_cases:       'Clinic',
  clinical_notes:      'Clinic',
  inventory_items:     'Financial',
  appointment_costs:   'Financial',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Reports: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<ReportMenu | null>(null);

  const renderContent = () => {
    switch (activeMenu) {
      case 'uninvoiced_bookings': return <UninvoicedBookings />;
      case 'cancellations':       return <Cancellations />;
      case 'clients_cases':       return <ClientCases />;
      case 'clinical_notes':      return <ClinicalNotes />;
      case 'inventory_items':     return <InventoryItems />;
      case 'appointment_costs':   return <AppointmentCosts />;
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
              {activeMenu ? (
                <>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                    <button
                      onClick={() => setActiveMenu(null)}
                      className="hover:text-orange-500 transition-colors"
                    >
                      Reports
                    </button>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-gray-500">{SECTION_FOR_MENU[activeMenu]}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-gray-700 font-medium">{REPORT_LABELS[activeMenu]}</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">{REPORT_LABELS[activeMenu]}</h1>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900">Reports</h1>
                  <p className="text-xs text-gray-500">Select a report to get started</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {activeMenu ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-2">
              <button
                onClick={() => setActiveMenu(null)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-500 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Reports
              </button>
            </div>
            {renderContent()}
          </div>
        ) : (
          /* ── Three-column card layout ── */
          <div className="flex-1 overflow-y-auto px-8 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {CARDS.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl p-6 shadow-sm ${card.cardBg}`}
                >
                  {/* Card title */}
                  <h2 className={`text-2xl font-bold mb-5 ${card.titleColor}`}>{card.title}</h2>

                  {/* Menu rows */}
                  <div className="flex flex-col gap-1.5">
                    {card.items.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveMenu(item.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 transition-colors ${card.rowHover} ${
                          idx % 2 === 0 ? card.rowOdd : card.rowEven
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};