import React from 'react';
import { TopNavigation } from './TopNavigation';
import { RightUtilityRail } from '@/components/layout/RightUtilityRail';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-full bg-clinical-cloud overflow-hidden flex flex-col">
      <TopNavigation />
      
      {/* Main Content Area & Utility Rail - Full height beneath the top navbar */}
      <div className="flex-1 flex flex-row overflow-hidden mt-[56px] w-full">
        {/* Main dynamically resizes based on utility rail's presence */}
        <main className="flex-1 min-w-0 h-full overflow-hidden relative transition-all duration-300 ease-in-out">
          {children}
        </main>

        <RightUtilityRail />
      </div>
    </div>
  );
};