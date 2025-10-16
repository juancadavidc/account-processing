'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useDashboardStore } from '@/stores/dashboard';
import { DollarSign, AlertCircle } from 'lucide-react';

export default function AmountRangeFilter() {
  const { amountRange, setFilters } = useDashboardStore();
  const [localAmountRange, setLocalAmountRange] = useState({
    min: amountRange?.min?.toString() || '',
    max: amountRange?.max?.toString() || ''
  });
  const [validationError, setValidationError] = useState('');

  // Debounce amount input
  useEffect(() => {
    const timer = setTimeout(() => {
      // Validate range
      const minVal = localAmountRange.min ? parseFloat(localAmountRange.min.replace(/[^0-9.-]/g, '')) : undefined;
      const maxVal = localAmountRange.max ? parseFloat(localAmountRange.max.replace(/[^0-9.-]/g, '')) : undefined;

      // Validation logic
      if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
        setValidationError('El monto mínimo debe ser menor o igual al máximo');
        return;
      }

      if (minVal !== undefined && minVal < 0) {
        setValidationError('Los montos no pueden ser negativos');
        return;
      }

      if (maxVal !== undefined && maxVal < 0) {
        setValidationError('Los montos no pueden ser negativos');
        return;
      }

      // Clear validation error if all is good
      setValidationError('');

      // Update store with valid range
      setFilters({ 
        amountRange: {
          min: minVal,
          max: maxVal
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [localAmountRange, setFilters]);

  // Update local state when store changes
  useEffect(() => {
    setLocalAmountRange({
      min: amountRange?.min?.toString() || '',
      max: amountRange?.max?.toString() || ''
    });
  }, [amountRange]);

  // Format Colombian peso display
  const formatCOPInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    
    // Add thousand separators
    return new Intl.NumberFormat('es-CO').format(parseInt(numericValue));
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCOPInput(e.target.value);
    setLocalAmountRange(prev => ({ ...prev, min: formatted }));
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCOPInput(e.target.value);
    setLocalAmountRange(prev => ({ ...prev, max: formatted }));
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        {/* Minimum Amount */}
        <div className="relative flex-1">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" data-testid="dollar-sign" />
          <Input
            placeholder="Mínimo"
            value={localAmountRange.min}
            onChange={handleMinChange}
            className={`pl-10 ${validationError ? 'border-red-500' : ''}`}
          />
        </div>
        
        {/* Maximum Amount */}
        <div className="relative flex-1">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" data-testid="dollar-sign" />
          <Input
            placeholder="Máximo"
            value={localAmountRange.max}
            onChange={handleMaxChange}
            className={`pl-10 ${validationError ? 'border-red-500' : ''}`}
          />
        </div>
      </div>
      
      {/* Validation Error Display */}
      {validationError && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}