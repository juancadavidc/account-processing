'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { useDashboardStore } from '@/stores/dashboard';
import { formatColombianCurrency } from '@/lib/colombian-formatting';
import { TooltipProps } from '@/lib/chart-types';


export function DailyComparison() {
  const { transactions, searchTerm, statusFilter } = useDashboardStore();

  const comparisonData = useMemo(() => {
    const now = new Date();
    const currentPeriodStart = startOfDay(now);
    const currentPeriodEnd = endOfDay(now);
    
    const previousPeriodStart = startOfDay(subDays(now, 1));
    const previousPeriodEnd = endOfDay(subDays(now, 1));

    const filteredTransactions = transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.senderName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === '' || 
        statusFilter === 'all' || 
        transaction.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    const currentTransactions = filteredTransactions.filter(tx =>
      isWithinInterval(tx.date, { start: currentPeriodStart, end: currentPeriodEnd })
    );

    const previousTransactions = filteredTransactions.filter(tx =>
      isWithinInterval(tx.date, { start: previousPeriodStart, end: previousPeriodEnd })
    );

    const currentAmount = currentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const previousAmount = previousTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const change = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;

    return [{
      period: 'Comparación',
      current: currentAmount,
      previous: previousAmount,
      currentCount: currentTransactions.length,
      previousCount: previousTransactions.length,
      change
    }];
  }, [transactions, searchTerm, statusFilter]);

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = comparisonData[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">Comparación Diaria</p>
          <div className="space-y-1">
            <p className="text-blue-600">
              Hoy: {formatColombianCurrency(data.current)} ({data.currentCount} tx)
            </p>
            <p className="text-gray-600">
              Ayer: {formatColombianCurrency(data.previous)} ({data.previousCount} tx)
            </p>
            <p className={`font-semibold ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Cambio: {data.change >= 0 ? '+' : ''}{data.change.toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <div className="space-y-4">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={comparisonData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barCategoryGap="40%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="period" 
              stroke="#666"
              fontSize={12}
              hide
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => formatColombianCurrency(value).replace('$', '')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="current" 
              name="Hoy"
              fill="#3b82f6" 
              radius={[2, 2, 0, 0]}
              maxBarSize={60}
            />
            <Bar 
              dataKey="previous" 
              name="Ayer"
              fill="#94a3b8" 
              radius={[2, 2, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {comparisonData[0] && (
        <div className="flex justify-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            comparisonData[0].change >= 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <span className="mr-1">
              {comparisonData[0].change >= 0 ? '↗' : '↘'}
            </span>
            {comparisonData[0].change >= 0 ? '+' : ''}{comparisonData[0].change.toFixed(1)}% vs ayer
          </div>
        </div>
      )}
    </div>
  );
}