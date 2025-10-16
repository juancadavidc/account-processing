'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDashboardStore } from '@/stores/dashboard';
import { formatColombianCurrency } from '@/lib/colombian-formatting';
import { TooltipProps } from '@/lib/chart-types';

interface TimelineDataPoint {
  date: string;
  amount: number;
  count: number;
}

export function DepositTimeline() {
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

  const timelineData = useMemo(() => {
    const dataMap = new Map<string, { amount: number; count: number }>();
    
    filteredTransactions.forEach(transaction => {
      const dateKey = format(transaction.date, 'yyyy-MM-dd');
      const existing = dataMap.get(dateKey) || { amount: 0, count: 0 };
      dataMap.set(dateKey, {
        amount: existing.amount + transaction.amount,
        count: existing.count + 1
      });
    });

    return Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date: format(new Date(date), 'dd/MM', { locale: es }),
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload as unknown as TimelineDataPoint;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{`Fecha: ${label}`}</p>
          <p className="text-green-600">
            {`Total: ${formatColombianCurrency(data.amount)}`}
          </p>
          <p className="text-gray-600">
            {`Transacciones: ${data.count}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (timelineData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => formatColombianCurrency(value).replace('$', '')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#22c55e" 
            strokeWidth={2}
            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}