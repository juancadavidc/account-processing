'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDashboardStore } from '@/stores/dashboard';
import { Transaction } from '@/lib/types';
import { format, isWithinInterval } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

type SortField = 'date' | 'time' | 'amount' | 'senderName' | 'accountNumber' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const ITEMS_PER_PAGE = 50;

export function TransactionTable() {
  const { 
    transactions, 
    searchTerm, 
    dateRange, 
    statusFilter, 
    loading,
    pagination,
    fetchTransactions
  } = useDashboardStore();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });

  // Filter transactions based on search, date range, and status
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        transaction.senderName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date range filter
      const matchesDateRange = isWithinInterval(transaction.date, {
        start: dateRange.start,
        end: dateRange.end
      });
      
      // Status filter
      const matchesStatus = statusFilter === '' || 
        statusFilter === 'all' || 
        transaction.status === statusFilter;
      
      return matchesSearch && matchesDateRange && matchesStatus;
    });
  }, [transactions, searchTerm, dateRange, statusFilter]);

  // Sort filtered transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      let aValue: string | number | Date = a[sortConfig.field];
      let bValue: string | number | Date = b[sortConfig.field];
      
      // Handle different data types
      if (sortConfig.field === 'date') {
        aValue = a.date.getTime();
        bValue = b.date.getTime();
      } else if (sortConfig.field === 'amount') {
        aValue = a.amount;
        bValue = b.amount;
      } else if (typeof aValue === 'string') {
        aValue = (aValue as string).toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredTransactions, sortConfig]);

  // For server-side pagination, we use all transactions directly since they're already paginated
  // For client-side sorting/filtering, we can still use the sortedTransactions
  const paginatedTransactions = useMemo(() => {
    return sortedTransactions;
  }, [sortedTransactions]);

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
  const currentPage = pagination.page + 1; // Convert 0-based to 1-based

  // Handle sorting
  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc'
    }));
    // Reset to first page when sorting
    fetchTransactions({ page: 0 });
  };

  // Format Colombian currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date for Colombian locale
  const formatDate = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
  };

  // Get status badge variant
  const getStatusVariant = (status: Transaction['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'processed': return 'default';
      case 'duplicate': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    fetchTransactions({ page: 0 });
  }, [searchTerm, dateRange, statusFilter, fetchTransactions]);

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  // Handle page navigation - triggers new data fetch
  const handlePageChange = async (page: number) => {
    const newPage = Math.max(0, Math.min(totalPages - 1, page - 1)); // Convert to 0-based
    await fetchTransactions({ page: newPage });
  };

  // Loading skeleton for table
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Remitente</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20 ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="text-sm text-muted-foreground">
          Cargando transacciones...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-2">
                  <span>Fecha</span>
                  {renderSortIcon('date')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('time')}
              >
                <div className="flex items-center space-x-2">
                  <span>Hora</span>
                  {renderSortIcon('time')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 text-right"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Monto</span>
                  {renderSortIcon('amount')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('senderName')}
              >
                <div className="flex items-center space-x-2">
                  <span>Remitente</span>
                  {renderSortIcon('senderName')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('accountNumber')}
              >
                <div className="flex items-center space-x-2">
                  <span>Cuenta</span>
                  {renderSortIcon('accountNumber')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-2">
                  <span>Estado</span>
                  {renderSortIcon('status')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No se encontraron transacciones
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/50">
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>{transaction.time}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.senderName}
                  </TableCell>
                  <TableCell className="font-mono">
                    {transaction.accountNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(transaction.status)}>
                      {transaction.status === 'processed' && 'Procesado'}
                      {transaction.status === 'failed' && 'Fallido'}
                      {transaction.status === 'duplicate' && 'Duplicado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, sortedTransactions.length)} de{' '}
            {sortedTransactions.length} transacciones
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Summary info */}
      <div className="text-sm text-muted-foreground">
        {filteredTransactions.length} transacciones encontradas
        {filteredTransactions.length !== transactions.length && 
          ` de ${transactions.length} totales`
        }
      </div>
    </div>
  );
}