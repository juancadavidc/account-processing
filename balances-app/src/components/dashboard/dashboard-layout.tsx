'use client';

import DashboardHeader from './dashboard-header';
import TabNavigation from './TabNavigation';
import { RealTimeIndicator } from './RealTimeIndicator';
import { useDataLoader } from '@/hooks/useDataLoader';

export default function DashboardLayout() {
  // Initialize real data loading
  const { error } = useDataLoader();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-4 md:py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">⚠️ {error}</p>
          </div>
        )}
        {/* Real-time Status Indicator */}
        <div className="mb-4">
          <RealTimeIndicator />
        </div>

        {/* Tab Navigation with all components */}
        <TabNavigation />
      </main>
    </div>
  );
}