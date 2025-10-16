/**
 * Tests for Zustand dashboard store
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from '../dashboard';
import { Transaction, DashboardMetrics } from '@/lib/types';
import { addDays, startOfDay, endOfDay } from 'date-fns';

// Mock transactions for testing
const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: `test-${Math.random().toString(36).substr(2, 9)}`,
  amount: 100000,
  currency: 'COP',
  senderName: 'TEST SENDER',
  accountNumber: '**1234',
  date: new Date(),
  time: '14:30',
  rawMessage: 'BANCOLOMBIA: Test transaction message',
  parsedAt: new Date(),
  webhookId: 'wh_test123',
  status: 'processed',
  ...overrides
});

describe('Dashboard Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.setTransactions([]);
      result.current.clearError();
      result.current.setLoading(false);
    });
  });

  describe('Initial State', () => {
    test('has correct initial state', () => {
      const { result } = renderHook(() => useDashboardStore());
      
      expect(result.current.transactions).toEqual([]);
      expect(result.current.metrics).toEqual({});
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.searchTerm).toBe('');
      expect(result.current.statusFilter).toBe('');
    });
  });

  describe('Transaction Management', () => {
    test('setTransactions updates state and calculates metrics', () => {
      const { result } = renderHook(() => useDashboardStore());
      const mockTransactions = [
        createMockTransaction({ amount: 100000 }),
        createMockTransaction({ amount: 200000 })
      ];

      act(() => {
        result.current.setTransactions(mockTransactions);
      });

      expect(result.current.transactions).toEqual(mockTransactions);
      expect(Object.keys(result.current.metrics)).toContain('daily');
      expect(Object.keys(result.current.metrics)).toContain('weekly');
      expect(Object.keys(result.current.metrics)).toContain('monthly');
    });

    test('addTransaction adds single transaction and updates metrics', () => {
      const { result } = renderHook(() => useDashboardStore());
      const mockTransaction = createMockTransaction({ amount: 150000 });

      act(() => {
        result.current.addTransaction(mockTransaction);
      });

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0]).toEqual(mockTransaction);
      expect(result.current.metrics.daily).toBeDefined();
    });

    test('addTransaction appends to existing transactions', () => {
      const { result } = renderHook(() => useDashboardStore());
      const firstTransaction = createMockTransaction({ amount: 100000 });
      const secondTransaction = createMockTransaction({ amount: 200000 });

      act(() => {
        result.current.setTransactions([firstTransaction]);
      });

      act(() => {
        result.current.addTransaction(secondTransaction);
      });

      expect(result.current.transactions).toHaveLength(2);
      expect(result.current.transactions[1]).toEqual(secondTransaction);
    });
  });

  describe('Metrics Calculation', () => {
    test('calculateMetrics computes daily metrics correctly', () => {
      const { result } = renderHook(() => useDashboardStore());
      const today = new Date();
      const todayTransactions = [
        createMockTransaction({ 
          amount: 100000, 
          date: today,
          status: 'processed' 
        }),
        createMockTransaction({ 
          amount: 200000, 
          date: today,
          status: 'processed' 
        }),
        createMockTransaction({ 
          amount: 50000, 
          date: addDays(today, -1), // Yesterday - should not be included
          status: 'processed' 
        })
      ];

      act(() => {
        result.current.setTransactions(todayTransactions);
      });

      const dailyMetrics = result.current.metrics.daily;
      expect(dailyMetrics).toBeDefined();
      expect(dailyMetrics.totalAmount).toBe(300000); // Only today's transactions
      expect(dailyMetrics.transactionCount).toBe(2);
      expect(dailyMetrics.averageAmount).toBe(150000);
      expect(dailyMetrics.period).toBe('daily');
    });

    test('calculateMetrics excludes failed and duplicate transactions', () => {
      const { result } = renderHook(() => useDashboardStore());
      const today = new Date();
      const transactions = [
        createMockTransaction({ 
          amount: 100000, 
          date: today,
          status: 'processed' 
        }),
        createMockTransaction({ 
          amount: 200000, 
          date: today,
          status: 'failed' // Should be excluded
        }),
        createMockTransaction({ 
          amount: 300000, 
          date: today,
          status: 'duplicate' // Should be excluded
        })
      ];

      act(() => {
        result.current.setTransactions(transactions);
      });

      const dailyMetrics = result.current.metrics.daily;
      expect(dailyMetrics.totalAmount).toBe(100000); // Only processed transaction
      expect(dailyMetrics.transactionCount).toBe(1);
      expect(dailyMetrics.averageAmount).toBe(100000);
    });

    test('calculateMetrics handles empty transactions', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setTransactions([]);
      });

      const dailyMetrics = result.current.metrics.daily;
      expect(dailyMetrics).toBeDefined();
      expect(dailyMetrics.totalAmount).toBe(0);
      expect(dailyMetrics.transactionCount).toBe(0);
      expect(dailyMetrics.averageAmount).toBe(0);
    });

    test('updateMetrics allows manual metric updates', () => {
      const { result } = renderHook(() => useDashboardStore());
      const customMetrics: DashboardMetrics = {
        period: 'weekly',
        totalAmount: 500000,
        transactionCount: 5,
        averageAmount: 100000,
        periodStart: startOfDay(new Date()),
        periodEnd: endOfDay(new Date()),
        lastUpdated: new Date()
      };

      act(() => {
        result.current.updateMetrics('weekly', customMetrics);
      });

      expect(result.current.metrics.weekly).toEqual(customMetrics);
    });
  });

  describe('Filter Management', () => {
    test('setFilters updates filter state', () => {
      const { result } = renderHook(() => useDashboardStore());
      const newDateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      };

      act(() => {
        result.current.setFilters({
          searchTerm: 'test search',
          dateRange: newDateRange,
          statusFilter: 'processed'
        });
      });

      expect(result.current.searchTerm).toBe('test search');
      expect(result.current.dateRange).toEqual(newDateRange);
      expect(result.current.statusFilter).toBe('processed');
    });

    test('setFilters allows partial updates', () => {
      const { result } = renderHook(() => useDashboardStore());
      
      act(() => {
        result.current.setFilters({ searchTerm: 'initial' });
      });

      act(() => {
        result.current.setFilters({ statusFilter: 'processed' });
      });

      expect(result.current.searchTerm).toBe('initial');
      expect(result.current.statusFilter).toBe('processed');
    });
  });

  describe('Loading and Error States', () => {
    test('setLoading updates loading state', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    test('setError updates error state', () => {
      const { result } = renderHook(() => useDashboardStore());
      const errorMessage = 'Test error message';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    test('clearError resets error state', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setError('Some error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Integration Tests', () => {
    test('complete workflow: load transactions, add new one, check metrics', () => {
      const { result } = renderHook(() => useDashboardStore());
      const today = new Date();
      
      // Initial load
      const initialTransactions = [
        createMockTransaction({ amount: 100000, date: today }),
        createMockTransaction({ amount: 200000, date: today })
      ];

      act(() => {
        result.current.setTransactions(initialTransactions);
      });

      expect(result.current.transactions).toHaveLength(2);
      expect(result.current.metrics.daily.totalAmount).toBe(300000);

      // Add new transaction
      const newTransaction = createMockTransaction({ amount: 150000, date: today });

      act(() => {
        result.current.addTransaction(newTransaction);
      });

      expect(result.current.transactions).toHaveLength(3);
      expect(result.current.metrics.daily.totalAmount).toBe(450000);
      expect(result.current.metrics.daily.averageAmount).toBe(150000);
    });

    test('metrics recalculation performance with many transactions', () => {
      const { result } = renderHook(() => useDashboardStore());
      const today = new Date();
      
      // Create 100 transactions for performance test
      const manyTransactions = Array.from({ length: 100 }, (_, i) =>
        createMockTransaction({ 
          amount: 100000 + i * 1000,
          date: today,
          id: `perf-test-${i}`
        })
      );

      const startTime = performance.now();

      act(() => {
        result.current.setTransactions(manyTransactions);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.transactions).toHaveLength(100);
      expect(result.current.metrics.daily.transactionCount).toBe(100);
      expect(duration).toBeLessThan(50); // Should complete quickly
    });
  });
});