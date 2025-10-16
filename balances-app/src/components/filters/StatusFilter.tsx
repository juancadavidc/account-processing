'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/stores/dashboard';

export function StatusFilter() {
  const { statusFilter, setFilters, transactions } = useDashboardStore();

  // Count transactions by status
  const statusCounts = transactions.reduce((acc, transaction) => {
    acc[transaction.status] = (acc[transaction.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleStatusChange = (value: string) => {
    setFilters({ statusFilter: value });
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'processed': return 'default';
      case 'duplicate': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Filtrar por estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center justify-between w-full">
              <span>Todos los estados</span>
              <Badge variant="outline" className="ml-2">
                {statusCounts.total || 0}
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="processed">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Badge variant="default">Procesado</Badge>
              </div>
              <Badge variant="outline" className="ml-2">
                {statusCounts.processed || 0}
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="failed">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Fallido</Badge>
              </div>
              <Badge variant="outline" className="ml-2">
                {statusCounts.failed || 0}
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="duplicate">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Duplicado</Badge>
              </div>
              <Badge variant="outline" className="ml-2">
                {statusCounts.duplicate || 0}
              </Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Display current filter */}
      {statusFilter && statusFilter !== 'all' && (
        <div className="text-sm text-muted-foreground">
          Mostrando: <Badge variant={getStatusVariant(statusFilter)}>
            {statusFilter === 'processed' && 'Procesado'}
            {statusFilter === 'failed' && 'Fallido'}
            {statusFilter === 'duplicate' && 'Duplicado'}
          </Badge>
        </div>
      )}
    </div>
  );
}