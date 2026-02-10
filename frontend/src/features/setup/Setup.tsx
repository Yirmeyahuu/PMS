import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ArrowLeft, Building2, Package, Users, CreditCard, Puzzle, Link2 } from 'lucide-react';
import { SetupCard as SetupCardComponent } from './components/SetupCard';
import type { SetupCard } from './types/setup.types';

// Import all subpage components
import { PracticeOption1 } from './pages/practice/PracticeOption1';
import { PracticeOption2 } from './pages/practice/PracticeOption2';
import { PracticeOption3 } from './pages/practice/PracticeOption3';
import { ItemsOption1 } from './pages/items/ItemsOption1';
import { ItemsOption2 } from './pages/items/ItemsOption2';
import { ItemsOption3 } from './pages/items/ItemsOption3';
import { Staff } from './pages/users/Staff';
import { Permissions } from './pages/users/Permissions';
import { AccountOption1 } from './pages/account/AccountOption1';
import { AccountOption2 } from './pages/account/AccountOption2';
import { AccountOption3 } from './pages/account/AccountOption3';
import { ExtensionsOption1 } from './pages/extensions/ExtensionsOption1';
import { ExtensionsOption2 } from './pages/extensions/ExtensionsOption2';
import { ExtensionsOption3 } from './pages/extensions/ExtensionsOption3';
import { ConnectionsOption1 } from './pages/connections/ConnectionsOption1';
import { ConnectionsOption2 } from './pages/connections/ConnectionsOption2';
import { ConnectionsOption3 } from './pages/connections/ConnectionsOption3';

// Define setup cards
const SETUP_CARDS: SetupCard[] = [
  {
    id: 'practice',
    title: 'Practice',
    icon: Building2,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    options: [
      { id: 'option1', label: 'Option 1', component: PracticeOption1 },
      { id: 'option2', label: 'Option 2', component: PracticeOption2 },
      { id: 'option3', label: 'Option 3', component: PracticeOption3 },
    ],
  },
  {
    id: 'items',
    title: 'Items',
    icon: Package,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    options: [
      { id: 'option1', label: 'Option 1', component: ItemsOption1 },
      { id: 'option2', label: 'Option 2', component: ItemsOption2 },
      { id: 'option3', label: 'Option 3', component: ItemsOption3 },
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
      { id: 'option1', label: 'Option 1', component: AccountOption1 },
      { id: 'option2', label: 'Option 2', component: AccountOption2 },
      { id: 'option3', label: 'Option 3', component: AccountOption3 },
    ],
  },
  {
    id: 'extensions',
    title: 'Extensions',
    icon: Puzzle,
    color: 'bg-pink-500',
    bgColor: 'bg-pink-50',
    options: [
      { id: 'option1', label: 'Option 1', component: ExtensionsOption1 },
      { id: 'option2', label: 'Option 2', component: ExtensionsOption2 },
      { id: 'option3', label: 'Option 3', component: ExtensionsOption3 },
    ],
  },
  {
    id: 'connections',
    title: 'Connections',
    icon: Link2,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    options: [
      { id: 'option1', label: 'Option 1', component: ConnectionsOption1 },
      { id: 'option2', label: 'Option 2', component: ConnectionsOption2 },
      { id: 'option3', label: 'Option 3', component: ConnectionsOption3 },
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
        {/* Show subpage content if selected */}
        {ActiveComponent ? (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Back button header */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
              <button
                onClick={handleBackToCards}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Setup</span>
              </button>
            </div>

            {/* Subpage content */}
            <div className="flex-1 overflow-y-auto">
              <ActiveComponent />
            </div>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm p-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Setup</h1>
                <p className="text-sm text-gray-600">
                  Configure your practice settings and preferences
                </p>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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