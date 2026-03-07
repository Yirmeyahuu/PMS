import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ArrowLeft, Building2, Package, Users, CreditCard } from 'lucide-react';
import { SetupCard as SetupCardComponent } from './components/SetupCard';
import type { SetupCard } from './types/setup.types';

// Import all subpage components
import { PracticeOption1 } from './pages/practice/Locations';
import { PracticeOption2 } from './pages/practice/Invoicing';
import { Inventory } from './pages/items/Inventory';
import { Staff } from './pages/users/Staff';
import { Permissions } from './pages/users/Permissions';
import { Subscription } from './pages/account/Subscription';

// Define setup cards
const SETUP_CARDS: SetupCard[] = [
  {
    id: 'practice',
    title: 'Practice',
    icon: Building2,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    options: [
      { id: 'option1', label: 'Locations', component: PracticeOption1 },
      { id: 'option2', label: 'Invoicing', component: PracticeOption2 },
    ],
  },
  {
    id: 'items',
    title: 'Items',
    icon: Package,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    options: [
      { id: 'Inventory', label: 'Inventory', component: Inventory },
    ],
  },
  {
    id: 'users',
    title: 'Users',
    icon: Users,
    color: 'bg-teal-500',
    bgColor: 'bg-teal-50',
    options: [
      { id: 'staff', label: 'Staff', component: Staff },
      { id: 'permissions', label: 'Permissions', component: Permissions },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    icon: CreditCard,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    options: [
      { id: 'option1', label: 'Subscription', component: Subscription },
    ],
  },
];

export const Setup: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionClick = (cardId: string, optionId: string) => {
    setSelectedCard(cardId);
    setSelectedOption(optionId);
  };

  const handleBackToCards = () => {
    setSelectedCard(null);
    setSelectedOption(null);
  };

  // Find the active component
  const ActiveComponent = selectedCard && selectedOption
    ? SETUP_CARDS
        .find((card) => card.id === selectedCard)
        ?.options.find((option) => option.id === selectedOption)?.component
    : null;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">

        {/* ── Subpage View ── */}
        {ActiveComponent ? (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Back button header */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-4">
              <button
                onClick={handleBackToCards}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Setup</span>
              </button>
            </div>

            {/* Subpage content */}
            <div className="flex-1 overflow-y-auto">
              <ActiveComponent />
            </div>
          </div>

        ) : (
          <>
            {/* ── Page Header ── */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-8 py-6">
              <h1 className="text-2xl font-bold text-gray-900">Setup</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Configure your practice settings and preferences
              </p>
            </div>

            {/* ── Cards Grid — 2 cols × 2 rows ── */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 gap-6">
                  {SETUP_CARDS.map((card) => (
                    <SetupCardComponent
                      key={card.id}
                      card={card}
                      onOptionClick={handleOptionClick}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};