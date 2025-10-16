import { create } from 'zustand';
import { Transaction, DashboardMetrics } from '@/lib/types';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, isWithinInterval } from 'date-fns';
import { TransactionDatabase } from '@/lib/database';
import { RealtimeSubscriptions } from '@/lib/realtime';
import { cache, CacheKeys } from '@/lib/cache';

// Type guard to check if an object is a valid DashboardMetrics
const isValidDashboardMetrics = (obj: unknown): obj is DashboardMetrics => {
  return obj !== null && 
         typeof obj === 'object' && 
         typeof (obj as DashboardMetrics).totalAmount === 'number' &&
         typeof (obj as DashboardMetrics).transactionCount === 'number' &&
         typeof (obj as DashboardMetrics).averageAmount === 'number';
};

interface FilterState {
  searchTerm: string;
  dateRange: { start: Date; end: Date };
  statusFilter: string;
  amountRange: { min?: number; max?: number };
}

interface DashboardStore {
  // Data State
  transactions: Transaction[];
  metrics: Record<string, DashboardMetrics>;
  loading: boolean;
  metricsUpdating: boolean;
  error: string | null;
  realTimeConnected: boolean;
  lastUpdated: Date | null;
  
  // Filter State
  searchTerm: string;
  dateRange: { start: Date; end: Date };
  statusFilter: string;
  amountRange: { min?: number; max?: number };
  
  // Pagination State
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  
  // Actions - Real Data Operations
  fetchTransactions: (filters?: Partial<FilterState & { page?: number; limit?: number }>) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  subscribeToRealTime: () => void;
  unsubscribeFromRealTime: () => void;
  refreshData: () => Promise<void>;
  
  // Actions - Legacy (kept for compatibility)
  addTransaction: (transaction: Transaction) => void;
  setTransactions: (transactions: Transaction[]) => void;
  updateMetrics: (period: string, metrics: DashboardMetrics) => void;
  calculateMetrics: () => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setLoading: (loading: boolean) => void;
  setMetricsUpdating: (updating: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Real-time Actions
  setRealTimeConnected: (connected: boolean) => void;
  setLastUpdated: (date: Date) => void;
  setPagination: (pagination: Partial<{ page: number; limit: number; total: number }>) => void;
}

const calculatePeriodMetrics = (
  transactions: Transaction[], 
  period: 'daily' | 'weekly' | 'monthly',
  referenceDate: Date = new Date()
): DashboardMetrics => {
  let periodStart: Date;
  let periodEnd: Date;
  
  switch (period) {
    case 'daily':
      periodStart = startOfDay(referenceDate);
      periodEnd = endOfDay(referenceDate);
      break;
    case 'weekly':
      periodStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday start
      periodEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
      break;
    case 'monthly':
      periodStart = startOfMonth(referenceDate);
      periodEnd = endOfMonth(referenceDate);
      break;
  }
  
  // Filter transactions within the period and only processed ones
  const periodTransactions = transactions.filter(transaction => 
    transaction.status === 'processed' &&
    isWithinInterval(transaction.date, { start: periodStart, end: periodEnd })
  );
  
  const totalAmount = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = periodTransactions.length;
  const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;
  
  return {
    period,
    totalAmount,
    transactionCount,
    averageAmount,
    periodStart,
    periodEnd,
    lastUpdated: new Date()
  };
};

const initialDateRange = {
  start: startOfMonth(new Date()),
  end: endOfMonth(new Date())
};

// Global realtime subscription instance
let realtimeInstance: RealtimeSubscriptions | null = null;

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Initial state
  transactions: [],
  metrics: {},
  loading: false,
  metricsUpdating: false,
  error: null,
  realTimeConnected: false,
  lastUpdated: null,
  searchTerm: '',
  dateRange: initialDateRange,
  statusFilter: 'all',
  amountRange: { min: undefined, max: undefined },
  pagination: {
    page: 0,
    limit: 50,
    total: 0
  },
  
  // Real Data Operations
  fetchTransactions: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      const { dateRange, statusFilter, searchTerm, amountRange, page = 0, limit = 50 } = {
        ...get(),
        ...filters
      };
      
      const dbFilters: Record<string, unknown> = {
        limit,
        offset: page * limit
      };
      
      if (dateRange) {
        dbFilters.startDate = dateRange.start;
        dbFilters.endDate = dateRange.end;
      }
      
      if (statusFilter && statusFilter !== 'all') {
        dbFilters.status = statusFilter;
      }

      if (searchTerm && searchTerm.trim()) {
        dbFilters.searchTerm = searchTerm.trim();
      }

      if (amountRange && (amountRange.min !== undefined || amountRange.max !== undefined)) {
        dbFilters.amountRange = amountRange;
      }
      
      const transactions = await TransactionDatabase.getTransactions(dbFilters);
      
      set({ 
        transactions,
        lastUpdated: new Date(),
        pagination: { page, limit, total: transactions.length }
      });
      
      // Recalculate metrics with new data
      get().calculateMetrics();
      
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      set({ error: 'Failed to load transactions from database' });
    } finally {
      set({ loading: false });
    }
  },

  fetchMetrics: async () => {
    try {
      // Set updating state while preserving existing metrics
      set({ metricsUpdating: true, error: null });
      
      const now = new Date();
      
      // Fetch detailed metrics for all periods using database aggregations
      const [dailyMetrics, weeklyMetrics, monthlyMetrics] = await Promise.all([
        TransactionDatabase.getDetailedMetrics('daily', now),
        TransactionDatabase.getDetailedMetrics('weekly', now),
        TransactionDatabase.getDetailedMetrics('monthly', now)
      ]);
      
      // Update metrics while keeping existing state intact
      // Only update metrics if valid data is received
      set((state) => {
        const newMetrics = { ...state.metrics };
        
        // Only update if we received valid metrics data
        if (isValidDashboardMetrics(dailyMetrics)) {
          newMetrics.daily = dailyMetrics;
        }
        if (isValidDashboardMetrics(weeklyMetrics)) {
          newMetrics.weekly = weeklyMetrics;
        }
        if (isValidDashboardMetrics(monthlyMetrics)) {
          newMetrics.monthly = monthlyMetrics;
        }
        
        return {
          metrics: newMetrics,
          metricsUpdating: false
        };
      });
      
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      set({ 
        error: 'Failed to load metrics from database',
        metricsUpdating: false
      });
    }
  },

  subscribeToRealTime: () => {
    try {
      if (!realtimeInstance) {
        realtimeInstance = new RealtimeSubscriptions();
      }
      
      realtimeInstance.subscribeToTransactions((newTransaction) => {
        // Add transaction optimistically
        get().addTransaction(newTransaction);
        set({ 
          lastUpdated: new Date(),
          realTimeConnected: true 
        });

        // Use targeted cache invalidation instead of clearing all cache
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const dailyKey = CacheKeys.metrics(`daily:${dateStr}`);
        const weeklyKey = CacheKeys.metrics(`weekly:${dateStr}`);
        const monthlyKey = CacheKeys.metrics(`monthly:${dateStr}`);
        
        cache.delete(dailyKey);
        cache.delete(weeklyKey);
        cache.delete(monthlyKey);

        // Refresh metrics using stale-while-revalidate pattern
        get().fetchMetrics();
      });
      
      set({ realTimeConnected: true });
      
    } catch (error) {
      console.error('Failed to subscribe to real-time updates:', error);
      set({ 
        realTimeConnected: false,
        error: 'Real-time updates unavailable' 
      });
    }
  },

  unsubscribeFromRealTime: () => {
    if (realtimeInstance) {
      realtimeInstance.unsubscribeAll();
      realtimeInstance = null;
    }
    set({ realTimeConnected: false });
  },

  refreshData: async () => {
    await Promise.all([
      get().fetchTransactions(),
      get().fetchMetrics()
    ]);
  },

  // Legacy Actions (kept for compatibility)
  addTransaction: (transaction) => {
    set((state) => {
      const updatedTransactions = [...state.transactions, transaction];
      return { transactions: updatedTransactions };
    });
    get().calculateMetrics();
  },
  
  setTransactions: (transactions) => {
    set({ transactions });
    get().calculateMetrics();
  },
  
  updateMetrics: (period, metrics) => {
    set((state) => ({
      metrics: { ...state.metrics, [period]: metrics }
    }));
  },
  
  calculateMetrics: () => {
    const { transactions } = get();
    const now = new Date();
    
    const dailyMetrics = calculatePeriodMetrics(transactions, 'daily', now);
    const weeklyMetrics = calculatePeriodMetrics(transactions, 'weekly', now);
    const monthlyMetrics = calculatePeriodMetrics(transactions, 'monthly', now);
    
    set((state) => ({
      metrics: {
        ...state.metrics, // Preserve existing metrics
        daily: dailyMetrics,
        weekly: weeklyMetrics,
        monthly: monthlyMetrics
      }
    }));
  },
  
  setFilters: (filters) => {
    set((state) => ({
      searchTerm: filters.searchTerm ?? state.searchTerm,
      dateRange: filters.dateRange ?? state.dateRange,
      statusFilter: filters.statusFilter ?? state.statusFilter,
      amountRange: filters.amountRange ?? state.amountRange
    }));
    // Refetch data with new filters
    get().fetchTransactions(filters);
  },
  
  setLoading: (loading) => set({ loading }),
  setMetricsUpdating: (updating) => set({ metricsUpdating: updating }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Real-time State Actions
  setRealTimeConnected: (connected) => set({ realTimeConnected: connected }),
  setLastUpdated: (date) => set({ lastUpdated: date }),
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  }))
}));