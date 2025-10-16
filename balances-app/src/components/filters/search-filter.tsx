'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useDashboardStore } from '@/stores/dashboard';
import { Search } from 'lucide-react';

export default function SearchFilter() {
  const { searchTerm, setFilters } = useDashboardStore();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchTerm: localSearchTerm });
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, setFilters]);

  // Update local state when store changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Buscar por remitente..."
        value={localSearchTerm}
        onChange={(e) => setLocalSearchTerm(e.target.value)}
        className="pl-10 w-full max-w-sm"
      />
    </div>
  );
}