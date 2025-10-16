/**
 * Zero Flash Component Logic Test
 * 
 * This test simulates the actual logic that happens in MetricsCards component
 * to identify when zero values are shown to users.
 */

import { useDashboardStore } from '../../stores/dashboard';
import { DashboardMetrics } from '@/lib/types';

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

// Simulate the exact logic from MetricsCards component
const simulateMetricsCardsLogic = (storeState: ReturnType<typeof useDashboardStore.getState>) => {
  const { metrics, loading, metricsUpdating } = storeState;
  
  if (loading) {
    return { showingSkeleton: true, values: null };
  }

  // Default empty metrics for when no data is available - THIS IS THE PROBLEM
  const getDefaultMetrics = (period: 'daily' | 'weekly' | 'monthly'): DashboardMetrics => ({
    period,
    totalAmount: 0,        // ← ZERO VALUES THAT CAUSE FLASH
    transactionCount: 0,   // ← ZERO VALUES THAT CAUSE FLASH
    averageAmount: 0,      // ← ZERO VALUES THAT CAUSE FLASH
    periodStart: new Date(),
    periodEnd: new Date(),
    lastUpdated: new Date()
  });

  // This is the actual logic from MetricsCards that causes zero flash
  const dailyMetrics = metrics.daily || getDefaultMetrics('daily');
  const weeklyMetrics = metrics.weekly || getDefaultMetrics('weekly');
  const monthlyMetrics = metrics.monthly || getDefaultMetrics('monthly');

  return {
    showingSkeleton: false,
    values: {
      daily: {
        totalAmount: dailyMetrics.totalAmount,
        transactionCount: dailyMetrics.transactionCount,
        isDefault: !metrics.daily
      },
      weekly: {
        totalAmount: weeklyMetrics.totalAmount,
        transactionCount: weeklyMetrics.transactionCount,
        isDefault: !metrics.weekly
      },
      monthly: {
        totalAmount: monthlyMetrics.totalAmount,
        transactionCount: monthlyMetrics.transactionCount,
        isDefault: !metrics.monthly
      },
      updating: metricsUpdating
    }
  };
};

describe('Zero Flash Component Logic Test', () => {
  const mockMetrics: DashboardMetrics = {
    period: 'daily' as const,
    totalAmount: 100000,
    transactionCount: 5,
    averageAmount: 20000,
    periodStart: new Date('2024-09-06T00:00:00Z'),
    periodEnd: new Date('2024-09-06T23:59:59Z'),
    lastUpdated: new Date('2024-09-06T14:30:00Z')
  };

  beforeEach(() => {
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

    jest.clearAllMocks();
  });

  test('should detect zero flash when metrics become undefined', () => {
    // Setup: Component has been showing real values
    useDashboardStore.setState({
      metrics: {
        daily: { ...mockMetrics, totalAmount: 75000, transactionCount: 3 },
        weekly: { ...mockMetrics, period: 'weekly', totalAmount: 200000, transactionCount: 8 },
        monthly: { ...mockMetrics, period: 'monthly', totalAmount: 500000, transactionCount: 20 }
      }
    });

    // Simulate initial render - should show real values
    let storeState = useDashboardStore.getState();
    let componentOutput = simulateMetricsCardsLogic(storeState);
    
    console.log('Initial values shown to user:');
    console.log('  Daily: $' + componentOutput.values?.daily.totalAmount?.toLocaleString());
    console.log('  Weekly: $' + componentOutput.values?.weekly.totalAmount?.toLocaleString());
    console.log('  Monthly: $' + componentOutput.values?.monthly.totalAmount?.toLocaleString());

    expect(componentOutput.values?.daily.totalAmount).toBe(75000);
    expect(componentOutput.values?.daily.isDefault).toBe(false);

    // Now simulate what happens during real-time update when metrics become empty
    useDashboardStore.setState({
      metrics: {}, // This is what causes the zero flash
      metricsUpdating: true
    });

    storeState = useDashboardStore.getState();
    componentOutput = simulateMetricsCardsLogic(storeState);

    console.log('\\nValues shown during update (ZERO FLASH):');
    console.log('  Daily: $' + componentOutput.values?.daily.totalAmount?.toLocaleString());
    console.log('  Weekly: $' + componentOutput.values?.weekly.totalAmount?.toLocaleString());
    console.log('  Monthly: $' + componentOutput.values?.monthly.totalAmount?.toLocaleString());
    console.log('  Using defaults:', {
      daily: componentOutput.values?.daily.isDefault,
      weekly: componentOutput.values?.weekly.isDefault,
      monthly: componentOutput.values?.monthly.isDefault
    });

    // THIS TEST SHOULD FAIL - proving the zero flash exists
    const hasZeroFlash = componentOutput.values?.daily.totalAmount === 0 ||
                        componentOutput.values?.weekly.totalAmount === 0 ||
                        componentOutput.values?.monthly.totalAmount === 0;

    console.log('\\nZero flash detected:', hasZeroFlash);

    // This assertion will fail if zero flash is happening (which it should be)
    expect(hasZeroFlash).toBe(false);
  });

  test('should show the exact sequence that users see during real-time updates', async () => {
    // Initial state with good data
    useDashboardStore.setState({
      metrics: {
        daily: { ...mockMetrics, totalAmount: 50000, transactionCount: 2 }
      }
    });

    const sequence: Array<{step: string, dailyAmount: number, isDefault: boolean}> = [];

    // Step 1: Initial render
    let storeState = useDashboardStore.getState();
    let output = simulateMetricsCardsLogic(storeState);
    sequence.push({
      step: 'initial',
      dailyAmount: output.values?.daily.totalAmount || 0,
      isDefault: output.values?.daily.isDefault || false
    });

    // Step 2: fetchMetrics starts, metricsUpdating = true (but metrics still exist)
    useDashboardStore.setState({ metricsUpdating: true });
    storeState = useDashboardStore.getState();
    output = simulateMetricsCardsLogic(storeState);
    sequence.push({
      step: 'updating-started',
      dailyAmount: output.values?.daily.totalAmount || 0,
      isDefault: output.values?.daily.isDefault || false
    });

    // Step 3: The problematic moment - metrics object becomes empty during async operation
    useDashboardStore.setState({ 
      metrics: {}, // ← THE PROBLEM
      metricsUpdating: true 
    });
    storeState = useDashboardStore.getState();
    output = simulateMetricsCardsLogic(storeState);
    sequence.push({
      step: 'metrics-cleared-ZERO-FLASH',
      dailyAmount: output.values?.daily.totalAmount || 0,
      isDefault: output.values?.daily.isDefault || false
    });

    // Step 4: New data arrives
    useDashboardStore.setState({
      metrics: {
        daily: { ...mockMetrics, totalAmount: 75000, transactionCount: 3 }
      },
      metricsUpdating: false
    });
    storeState = useDashboardStore.getState();
    output = simulateMetricsCardsLogic(storeState);
    sequence.push({
      step: 'new-data-arrived',
      dailyAmount: output.values?.daily.totalAmount || 0,
      isDefault: output.values?.daily.isDefault || false
    });

    console.log('\\nUser experience sequence:');
    sequence.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.step}: $${step.dailyAmount.toLocaleString()} ${step.isDefault ? '(DEFAULT/ZERO)' : '(REAL)'}`);
    });

    // Find if there's a step where zero is shown
    const zeroFlashStep = sequence.find(step => step.dailyAmount === 0);
    
    console.log('\\nZero flash occurs at step:', zeroFlashStep?.step || 'none');

    // This should fail if zero flash exists
    expect(zeroFlashStep).toBeUndefined();
  });

  test('should identify the fallback logic that causes zero flash', () => {
    // This test specifically examines the OR fallback logic that causes issues
    
    const storeStates = [
      { name: 'normal', metrics: { daily: { ...mockMetrics, totalAmount: 100000 } } },
      { name: 'empty-object', metrics: {} },
      { name: 'daily-undefined', metrics: { daily: undefined } },
      { name: 'daily-null', metrics: { daily: null } },
    ];

    console.log('\\nTesting fallback behavior:');
    
    storeStates.forEach(testState => {
      const result = simulateMetricsCardsLogic({
        ...useDashboardStore.getState(),
        metrics: testState.metrics,
        loading: false,
        metricsUpdating: false
      });

      const dailyAmount = result.values?.daily.totalAmount || 'undefined';
      const isDefault = result.values?.daily.isDefault;
      
      console.log(`  ${testState.name}: $${dailyAmount} ${isDefault ? '(FALLBACK TO ZERO)' : '(REAL)'}`);
      
      // Any fallback to zero is a problem
      if (isDefault && dailyAmount === 0) {
        console.log(`    ⚠️  ZERO FLASH DETECTED in ${testState.name}`);
      }
    });

    // The empty-object case should trigger zero flash
    const emptyObjectResult = simulateMetricsCardsLogic({
      metrics: {},
      loading: false,
      metricsUpdating: false
    });

    const causesZeroFlash = emptyObjectResult.values?.daily.totalAmount === 0;
    console.log('\\nEmpty metrics object causes zero flash:', causesZeroFlash);

    // This test documents the problem - it SHOULD fail showing zero flash exists
    expect(causesZeroFlash).toBe(false);
  });
});