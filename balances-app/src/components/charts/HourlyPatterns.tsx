'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { isWithinInterval } from 'date-fns';
import { useDashboardStore } from '@/stores/dashboard';
import { formatColombianCurrency } from '@/lib/colombian-formatting';
import { TooltipProps } from '@/lib/chart-types';

interface HourlyDataPoint {
  hour: string;
  count: number;
  total: number;
}

export function HourlyPatterns() {
  const { transactions, searchTerm, dateRange, statusFilter } = useDashboardStore();

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.senderName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDateRange = isWithinInterval(transaction.date, {
        start: dateRange.start,
        end: dateRange.end
      });
      
      const matchesStatus = statusFilter === '' || 
        statusFilter === 'all' || 
        transaction.status === statusFilter;
      
      return matchesSearch && matchesDateRange && matchesStatus;
    });
  }, [transactions, searchTerm, dateRange, statusFilter]);

  const hourlyData = useMemo(() => {
    const dataMap = new Map<number, { count: number; total: number }>();
    
    // Initialize all hours (0-23)
    for (let hour = 0; hour < 24; hour++) {
      dataMap.set(hour, { count: 0, total: 0 });
    }
    
    filteredTransactions.forEach(transaction => {
      const hour = parseInt(transaction.time.split(':')[0]);
      const existing = dataMap.get(hour) || { count: 0, total: 0 };
      dataMap.set(hour, {
        count: existing.count + 1,
        total: existing.total + transaction.amount
      });
    });

    return Array.from(dataMap.entries())
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count: data.count,
        total: data.total
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [filteredTransactions]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload as unknown as HourlyDataPoint;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{`Hora: ${label}`}</p>
          <p className="text-green-600">
            {`Total: ${formatColombianCurrency(data.total)}`}
          </p>
          <p className="text-gray-600">
            {`Transacciones: ${data.count}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (filteredTransactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="hour" 
            stroke="#666"
            fontSize={12}
            interval={3}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => formatColombianCurrency(value).replace('$', '')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="total" 
            fill="#22c55e" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}