'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchFilter, DateRangePicker, StatusFilter, AmountRangeFilter } from '@/components/filters';
import { useDashboardStore } from '@/stores/dashboard';
import { RotateCcw } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

export function FilterBar() {
  const { setFilters } = useDashboardStore();

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      statusFilter: '',
      dateRange: {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
      },
      amountRange: { min: undefined, max: undefined }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filtros de Transacciones</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Limpiar</span>
            </Button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <SearchFilter />
            </div>
            
            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <DateRangePicker />
            </div>
            
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <StatusFilter />
            </div>
            
            {/* Amount Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rango de Monto</label>
              <AmountRangeFilter />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}