'use client';

import { useMemo } from 'react';
import { isWithinInterval } from 'date-fns';
import { useDashboardStore } from '@/stores/dashboard';
import { formatColombianCurrency } from '@/lib/colombian-formatting';
import { Badge } from '@/components/ui/badge';


export function TopSenders() {
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

  const topSenders = useMemo(() => {
    const senderMap = new Map<string, { count: number; total: number }>();
    
    filteredTransactions.forEach(transaction => {
      const existing = senderMap.get(transaction.senderName) || { count: 0, total: 0 };
      senderMap.set(transaction.senderName, {
        count: existing.count + 1,
        total: existing.total + transaction.amount
      });
    });

    const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    return Array.from(senderMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 senders
  }, [filteredTransactions]);

  if (topSenders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {topSenders.map((sender, index) => (
        <div key={sender.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Badge variant="secondary" className="text-xs">
              #{index + 1}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate" title={sender.name}>
                {sender.name}
              </p>
              <p className="text-xs text-gray-600">
                {sender.count} transacción{sender.count !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0 ml-4">
            <p className="font-semibold text-green-600">
              {formatColombianCurrency(sender.total)}
            </p>
            <p className="text-xs text-gray-500">
              {sender.percentage.toFixed(1)}%
            </p>
          </div>
          
          <div className="w-16 ml-3 flex-shrink-0">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(sender.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}