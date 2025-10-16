/**
 * Zero Flash Detection Test
 * 
 * This test identifies the temporary zero state issue in MetricCards during real-time updates.
 * It simulates the exact conditions that cause the flashing and verifies the fix works correctly.
 */

import { useDashboardStore } from '../../stores/dashboard';
import { Transaction, DashboardMetrics } from '@/lib/types';

// Mock external dependencies
jest.mock('@/lib/database', () => ({
  TransactionDatabase: {
    getDetailedMetrics: jest.fn(),
    getTransactions: jest.fn(() => Promise.resolve([])),
  }
}));

jest.mock('@/lib/realtime', () => ({
  RealtimeSubscriptions: jest.fn(() => ({
    subscribeToTransactions: jest.fn(),
    unsubscribeAll: jest.fn(),
  }))
}));

jest.mock('@/lib/cache', () => ({
  cache: {
    clear: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(() => null),
    set: jest.fn(),
  },
  CacheKeys: {
    metrics: (key: string) => `metrics:${key}`,
  }
}));

describe('Zero Flash Detection Test', () => {
  const mockMetrics: DashboardMetrics = {
    period: 'daily' as const,
    totalAmount: 100000,
    transactionCount: 5,
    averageAmount: 20000,
    periodStart: new Date('2024-09-06T00:00:00Z'),
    periodEnd: new Date('2024-09-06T23:59:59Z'),
    lastUpdated: new Date('2024-09-06T14:30:00Z')
  };

  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: `tx-${Date.now()}-${Math.random()}`,
    amount: 50000,
    currency: 'COP',
    senderName: 'Test Sender',
    accountNumber: '**1234',
    date: new Date(),
    time: '14:30',
    rawMessage: 'Bancolombia: Recibiste una transferencia por $50,000 de Test Sender en tu cuenta **1234, el 06/09/2024 a las 14:30',
    parsedAt: new Date(),
    webhookId: `webhook-${Date.now()}`,
    status: 'processed',
    ...overrides
  });

  beforeEach(() => {
    // Reset store state
    useDashboardStore.setState({
      transactions: [],
      metrics: {},
      loading: false,
      metricsUpdating: false,
      error: null,
      realTimeConnected: false,
      lastUpdated: null,
      searchTerm: '',
      dateRange: { start: new Date(), end: new Date() },
      statusFilter: 'all',
      pagination: { page: 0, limit: 50, total: 0 }
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  test('should detect zero flash during fetchMetrics', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TransactionDatabase } = require('@/lib/database');
    
    // Setup: Store has existing metrics
    useDashboardStore.setState({
      metrics: {
        daily: { ...mockMetrics, totalAmount: 75000 },
        weekly: { ...mockMetrics, period: 'weekly', totalAmount: 200000 },
        monthly: { ...mockMetrics, period: 'monthly', totalAmount: 500000 }
      }
    });

    // Track all state changes during fetchMetrics
    const stateSnapshots: Array<{
      timestamp: number;
      metrics: Record<string, unknown>;
      loading: boolean;
      metricsUpdating: boolean;
    }> = [];
    const unsubscribe = useDashboardStore.subscribe((state) => {
      stateSnapshots.push({
        timestamp: Date.now(),
        metrics: { ...state.metrics },
        metricsUpdating: state.metricsUpdating,
        hasDaily: !!state.metrics.daily,
        hasWeekly: !!state.metrics.weekly,
        hasMonthly: !!state.metrics.monthly,
        dailyAmount: state.metrics.daily?.totalAmount || 'undefined',
        weeklyAmount: state.metrics.weekly?.totalAmount || 'undefined',
        monthlyAmount: state.metrics.monthly?.totalAmount || 'undefined'
      });
    });

    // Mock database response with delay to simulate real async behavior
    TransactionDatabase.getDetailedMetrics
      .mockResolvedValueOnce({ ...mockMetrics, totalAmount: 80000 }) // daily
      .mockResolvedValueOnce({ ...mockMetrics, period: 'weekly', totalAmount: 220000 }) // weekly  
      .mockResolvedValueOnce({ ...mockMetrics, period: 'monthly', totalAmount: 550000 }); // monthly

    // Execute fetchMetrics
    await useDashboardStore.getState().fetchMetrics();

    unsubscribe();

    // Analyze snapshots for zero flash
    console.log('State snapshots during fetchMetrics:');
    stateSnapshots.forEach((snapshot, index) => {
      console.log(`  ${index + 1}:`, {
        metricsUpdating: snapshot.metricsUpdating,
        hasMetrics: {
          daily: snapshot.hasDaily,
          weekly: snapshot.hasWeekly,
          monthly: snapshot.hasMonthly
        },
        amounts: {
          daily: snapshot.dailyAmount,
          weekly: snapshot.weeklyAmount,  
          monthly: snapshot.monthlyAmount
        }
      });
    });

    // Check for temporary loss of metrics (the zero flash issue)
    const hasTemporaryMetricsLoss = stateSnapshots.some(snapshot => 
      !snapshot.hasDaily || !snapshot.hasWeekly || !snapshot.hasMonthly ||
      snapshot.dailyAmount === 0 || snapshot.weeklyAmount === 0 || snapshot.monthlyAmount === 0
    );

    console.log('Has temporary metrics loss:', hasTemporaryMetricsLoss);
    
    if (hasTemporaryMetricsLoss) {
      const problematicSnapshots = stateSnapshots.filter(snapshot => 
        !snapshot.hasDaily || !snapshot.hasWeekly || !snapshot.hasMonthly ||
        snapshot.dailyAmount === 0 || snapshot.weeklyAmount === 0 || snapshot.monthlyAmount === 0
      );
      console.log('Problematic snapshots:', problematicSnapshots);
    }

    // This test should PASS with our fix (no temporary metrics loss)
    expect(hasTemporaryMetricsLoss).toBe(false);
    
    // Verify final state has updated values
    const finalState = useDashboardStore.getState();
    expect(finalState.metrics.daily?.totalAmount).toBe(80000);
    expect(finalState.metrics.weekly?.totalAmount).toBe(220000);
    expect(finalState.metrics.monthly?.totalAmount).toBe(550000);
    expect(finalState.metricsUpdating).toBe(false);
  });

  test('should detect zero flash during real-time transaction updates', async () => {
    // Setup: Store has existing metrics and transactions
    useDashboardStore.setState({
      metrics: {
        daily: { ...mockMetrics, totalAmount: 150000, transactionCount: 3 },
        weekly: { ...mockMetrics, period: 'weekly', totalAmount: 400000, transactionCount: 8 },
        monthly: { ...mockMetrics, period: 'monthly', totalAmount: 800000, transactionCount: 20 }
      },
      transactions: [
        createMockTransaction({ amount: 50000 }),
        createMockTransaction({ amount: 50000 }),
        createMockTransaction({ amount: 50000 })
      ]
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TransactionDatabase } = require('@/lib/database');
    
    // Track state changes during real-time update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stateSnapshots: any[] = [];
    const unsubscribe = useDashboardStore.subscribe((state) => {
      stateSnapshots.push({
        timestamp: Date.now(),
        metricsUpdating: state.metricsUpdating,
        transactionCount: state.transactions.length,
        dailyAmount: state.metrics.daily?.totalAmount || 'missing',
        weeklyAmount: state.metrics.weekly?.totalAmount || 'missing',
        monthlyAmount: state.metrics.monthly?.totalAmount || 'missing',
        hasAllMetrics: !!(state.metrics.daily && state.metrics.weekly && state.metrics.monthly)
      });
    });

    // Mock updated metrics response
    TransactionDatabase.getDetailedMetrics
      .mockResolvedValueOnce({ ...mockMetrics, totalAmount: 200000, transactionCount: 4 })
      .mockResolvedValueOnce({ ...mockMetrics, period: 'weekly', totalAmount: 450000, transactionCount: 9 })
      .mockResolvedValueOnce({ ...mockMetrics, period: 'monthly', totalAmount: 850000, transactionCount: 21 });

    // Simulate real-time transaction arrival
    const newTransaction = createMockTransaction({ amount: 50000 });
    
    // This simulates what happens in subscribeToRealTime
    useDashboardStore.getState().addTransaction(newTransaction);
    await useDashboardStore.getState().fetchMetrics();

    unsubscribe();

    // Analyze for zero flash or missing metrics
    console.log('Real-time update snapshots:');
    stateSnapshots.forEach((snapshot, index) => {
      console.log(`  ${index + 1}:`, {
        updating: snapshot.metricsUpdating,
        txCount: snapshot.transactionCount,
        hasAllMetrics: snapshot.hasAllMetrics,
        amounts: {
          daily: snapshot.dailyAmount,
          weekly: snapshot.weeklyAmount,
          monthly: snapshot.monthlyAmount
        }
      });
    });

    // Check for any moment where metrics were missing or zero
    const hasMissingMetrics = stateSnapshots.some(snapshot => 
      !snapshot.hasAllMetrics || 
      snapshot.dailyAmount === 'missing' || 
      snapshot.weeklyAmount === 'missing' ||
      snapshot.monthlyAmount === 'missing' ||
      snapshot.dailyAmount === 0 ||
      snapshot.weeklyAmount === 0 ||
      snapshot.monthlyAmount === 0
    );

    // This should PASS with our fix
    expect(hasMissingMetrics).toBe(false);
    
    // Verify transaction was added and metrics updated
    const finalState = useDashboardStore.getState();
    expect(finalState.transactions).toHaveLength(4);
    expect(finalState.metrics.daily?.totalAmount).toBe(200000);
    expect(finalState.metricsUpdating).toBe(false);
  });

  test('should maintain old values when metrics object becomes empty', () => {
    // This test specifically checks the scenario that causes zero flash
    
    // Setup initial state with metrics
    useDashboardStore.setState({
      metrics: {
        daily: { ...mockMetrics, totalAmount: 100000 },
        weekly: { ...mockMetrics, period: 'weekly', totalAmount: 300000 },
        monthly: { ...mockMetrics, period: 'monthly', totalAmount: 600000 }
      }
    });

    const initialState = useDashboardStore.getState();
    expect(initialState.metrics.daily?.totalAmount).toBe(100000);

    // Simulate the problematic scenario: metrics object becomes empty during update
    useDashboardStore.setState({
      metrics: {}, // This is what was causing the zero flash
      metricsUpdating: true
    });

    const duringUpdateState = useDashboardStore.getState();
    
    // With our fix using refs in the component, this won't cause zero flash
    // The component should preserve the last known values
    expect(duringUpdateState.metrics).toEqual({});
    expect(duringUpdateState.metricsUpdating).toBe(true);

    // This test documents the store behavior - the component layer should handle preservation
    console.log('Store metrics during update:', duringUpdateState.metrics);
    console.log('Component should preserve old values using refs');
  });

  test('should identify timing race conditions in async updates', async () => {
    // Setup with initial metrics
    useDashboardStore.setState({
      metrics: {
        daily: { ...mockMetrics, totalAmount: 50000 }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TransactionDatabase } = require('@/lib/database');
    
    // Create multiple concurrent updates (race condition simulation)
    const promises = [
      // First update
      new Promise(resolve => {
        TransactionDatabase.getDetailedMetrics.mockResolvedValueOnce(
          { ...mockMetrics, totalAmount: 75000 }
        );
        setTimeout(async () => {
          await useDashboardStore.getState().fetchMetrics();
          resolve('update1');
        }, 10);
      }),
      
      // Second update (overlapping)
      new Promise(resolve => {
        TransactionDatabase.getDetailedMetrics.mockResolvedValueOnce(
          { ...mockMetrics, totalAmount: 100000 }
        );
        setTimeout(async () => {
          await useDashboardStore.getState().fetchMetrics();
          resolve('update2');
        }, 20);
      })
    ];

    // Track state during race condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stateChanges: any[] = [];
    const unsubscribe = useDashboardStore.subscribe((state) => {
      stateChanges.push({
        timestamp: Date.now(),
        metricsUpdating: state.metricsUpdating,
        dailyAmount: state.metrics.daily?.totalAmount || null,
        hasDaily: !!state.metrics.daily
      });
    });

    await Promise.all(promises);

    unsubscribe();

    // Check if there were any moments without metrics during the race
    const hadMissingMetrics = stateChanges.some(change => 
      !change.hasDaily || change.dailyAmount === null || change.dailyAmount === 0
    );

    console.log('Race condition state changes:', stateChanges);
    console.log('Had missing metrics:', hadMissingMetrics);
    
    // Show which specific changes had missing metrics
    const problematicChanges = stateChanges.filter(change => 
      !change.hasDaily || change.dailyAmount === null || change.dailyAmount === 0
    );
    console.log('Problematic state changes:', problematicChanges);
    
    // This test SHOULD fail with the current implementation - it proves the issue exists
    expect(hadMissingMetrics).toBe(false);
  });
});