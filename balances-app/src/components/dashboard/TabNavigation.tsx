'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MetricsCards from './MetricsCards';
import ChartsGrid from './ChartsGrid';
import { FilterBar } from './FilterBar';
import { TransactionTable } from './TransactionTable';
import { BarChart3, Table } from 'lucide-react';

type TabType = 'charts' | 'transactions';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'charts',
    label: 'Charts',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: <Table className="h-4 w-4" />,
  },
];

export default function TabNavigation() {
  const [activeTab, setActiveTab] = useState<TabType>('charts');

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-1 py-2 border-b-2 font-medium text-sm",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4 md:space-y-6">
        {activeTab === 'charts' && (
          <>
            {/* Charts Tab: Charts + Filtros + Metrics */}
            
                        
            {/* Metrics Cards Section */}
            <MetricsCards /><div className=""></div>

            {/* Filter Section */}
            <div className="mb-4 md:mb-6">
              <FilterBar />
            </div>


            {/* Charts Section */}
            <div className="mb-4 md:mb-6">
              <ChartsGrid />
            </div>
          </>
        )}

        {activeTab === 'transactions' && (
          <>
            {/* Transactions Tab: Metrics + Filtros + Tabla */}
            
            {/* Metrics Cards Section */}
            <MetricsCards />
            
            {/* Filter Section */}
            <div className="mb-4 md:mb-6">
              <FilterBar />
            </div>
            
            {/* Transaction Table Section */}
            <Card className="banking-card">
              <CardHeader>
                <CardTitle>Transacciones</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionTable />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}