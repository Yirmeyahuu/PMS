import React from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardContent } from './components/DashboardContent';

export const Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
};