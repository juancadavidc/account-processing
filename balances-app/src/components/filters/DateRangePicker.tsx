'use client';

import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange as CalendarDateRange } from 'react-day-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardStore } from '@/stores/dashboard';

type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

// Use the built-in DateRange type from react-day-picker

export function DateRangePicker() {
  const { dateRange, setFilters } = useDashboardStore();
  const [selectedRange, setSelectedRange] = useState<CalendarDateRange>({
    from: dateRange.start,
    to: dateRange.end,
  });
  const [preset, setPreset] = useState<DatePreset>('thisMonth');
  const [isOpen, setIsOpen] = useState(false);

  const getPresetRange = (preset: DatePreset): { start: Date; end: Date } => {
    const now = new Date();
    
    switch (preset) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday),
        };
      case 'thisWeek':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        return {
          start: lastWeekStart,
          end: endOfWeek(lastWeekStart, { weekStartsOn: 1 }),
        };
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        return {
          start: lastMonthStart,
          end: endOfMonth(lastMonthStart),
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
    }
  };

  const handlePresetChange = (value: DatePreset) => {
    setPreset(value);
    
    if (value !== 'custom') {
      const range = getPresetRange(value);
      setSelectedRange({ from: range.start, to: range.end });
      setFilters({ dateRange: range });
      setIsOpen(false);
    }
  };

  const handleCustomRangeSelect = (range: CalendarDateRange | undefined) => {
    if (range?.from && range?.to) {
      setSelectedRange(range);
      setPreset('custom');
      setFilters({ 
        dateRange: { 
          start: startOfDay(range.from), 
          end: endOfDay(range.to) 
        } 
      });
    } else if (range?.from) {
      setSelectedRange({ from: range.from, to: undefined });
    }
  };

  const formatDateRange = () => {
    if (!selectedRange.from) {
      return "Seleccionar rango de fechas";
    }
    
    if (selectedRange.from && !selectedRange.to) {
      return format(selectedRange.from, "dd/MM/yyyy");
    }
    
    if (selectedRange.from && selectedRange.to) {
      return `${format(selectedRange.from, "dd/MM/yyyy")} - ${format(selectedRange.to, "dd/MM/yyyy")}`;
    }
    
    return "Seleccionar rango de fechas";
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Preset selector */}
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Seleccionar período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoy</SelectItem>
          <SelectItem value="yesterday">Ayer</SelectItem>
          <SelectItem value="thisWeek">Esta semana</SelectItem>
          <SelectItem value="lastWeek">Semana pasada</SelectItem>
          <SelectItem value="thisMonth">Este mes</SelectItem>
          <SelectItem value="lastMonth">Mes pasado</SelectItem>
          <SelectItem value="custom">Rango personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom date range picker */}
      {preset === 'custom' && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-full md:w-80 justify-start text-left font-normal",
                !selectedRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedRange.from}
              selected={selectedRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
              locale={es}
              disabled={(date) => date > new Date()}
            />
            <div className="p-3 border-t border-border">
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full"
                size="sm"
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Display selected range for non-custom presets */}
      {preset !== 'custom' && (
        <div className="text-sm text-muted-foreground">
          {formatDateRange()}
        </div>
      )}
    </div>
  );
}