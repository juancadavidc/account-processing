/**
 * Tests for mock data generation system
 * @jest-environment jsdom
 */

import { generateMockTransactions, generateRealTimeTransaction } from '../mock-data';
import { validateTransaction } from '../validation';

describe('Mock Data Generation', () => {
  describe('generateMockTransactions', () => {
    test('generates correct number of transactions', () => {
      const transactions = generateMockTransactions();
      
      expect(transactions.length).toBeGreaterThanOrEqual(100);
      expect(transactions.length).toBeLessThanOrEqual(150);
    });

    test('generates valid Transaction objects', () => {
      const transactions = generateMockTransactions();
      
      // Test first few transactions for structure
      transactions.slice(0, 5).forEach(transaction => {
        expect(validateTransaction(transaction)).toBe(true);
      });
    });

    test('generates transactions with Colombian patterns', () => {
      const transactions = generateMockTransactions();
      
      transactions.slice(0, 10).forEach(transaction => {
        // Check currency
        expect(transaction.currency).toBe('COP');
        
        // Check sender name format (uppercase letters and spaces)
        expect(transaction.senderName).toMatch(/^[A-Z\s]+$/);
        
        // Check account number format (**XXXX)
        expect(transaction.accountNumber).toMatch(/^\*\*\d{4}$/);
        
        // Check amount range (50,000 - 2,000,000 COP)
        expect(transaction.amount).toBeGreaterThanOrEqual(50000);
        expect(transaction.amount).toBeLessThanOrEqual(2000000);
        
        // Check time format (HH:mm)
        expect(transaction.time).toMatch(/^\d{2}:\d{2}$/);
        
        // Check status is valid
        expect(['processed', 'failed', 'duplicate']).toContain(transaction.status);
      });
    });

    test('generates transactions across multiple weeks', () => {
      const transactions = generateMockTransactions();
      
      // Get date range
      const dates = transactions.map(t => t.date);
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      const daysDifference = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDifference).toBeGreaterThanOrEqual(28); // At least 4 weeks
    });

    test('generates realistic SMS messages', () => {
      const transactions = generateMockTransactions();
      
      transactions.slice(0, 5).forEach(transaction => {
        expect(transaction.rawMessage).toContain('BANCOLOMBIA');
        expect(transaction.rawMessage).toContain(transaction.senderName);
        expect(transaction.rawMessage).toContain(transaction.accountNumber);
        expect(transaction.rawMessage.length).toBeGreaterThan(50);
      });
    });

    test('transactions are sorted chronologically', () => {
      const transactions = generateMockTransactions();
      
      for (let i = 1; i < transactions.length; i++) {
        expect(transactions[i].date.getTime()).toBeGreaterThanOrEqual(
          transactions[i - 1].date.getTime()
        );
      }
    });
  });

  describe('generateRealTimeTransaction', () => {
    test('generates single valid transaction', () => {
      const transaction = generateRealTimeTransaction();
      
      expect(validateTransaction(transaction)).toBe(true);
    });

    test('generates recent transaction', () => {
      const transaction = generateRealTimeTransaction();
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      expect(transaction.date.getTime()).toBeGreaterThanOrEqual(thirtyMinutesAgo.getTime());
      expect(transaction.date.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    test('follows Colombian patterns', () => {
      const transaction = generateRealTimeTransaction();
      
      expect(transaction.currency).toBe('COP');
      expect(transaction.senderName).toMatch(/^[A-Z\s]+$/);
      expect(transaction.accountNumber).toMatch(/^\*\*\d{4}$/);
      expect(transaction.amount).toBeGreaterThanOrEqual(50000);
      expect(transaction.amount).toBeLessThanOrEqual(2000000);
    });
  });

  describe('Performance Tests', () => {
    test('mock data generation completes within performance requirements', () => {
      const startTime = performance.now();
      const transactions = generateMockTransactions();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
      expect(transactions.length).toBeGreaterThanOrEqual(100);
    });

    test('real-time transaction generation is fast', () => {
      const startTime = performance.now();
      const transaction = generateRealTimeTransaction();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Should complete in < 10ms
      expect(validateTransaction(transaction)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles multiple generations consistently', () => {
      const transactions1 = generateMockTransactions();
      const transactions2 = generateMockTransactions();
      
      expect(transactions1.length).toBe(transactions2.length);
      
      // Each generation should be different (random)
      const sameTransactions = transactions1.filter(t1 =>
        transactions2.some(t2 => t1.id === t2.id)
      );
      expect(sameTransactions.length).toBe(0); // No duplicate IDs
    });

    test('generates transactions with varied patterns', () => {
      const transactions = generateMockTransactions();
      
      // Check for variety in transaction times
      const uniqueHours = new Set(transactions.map(t => parseInt(t.time.split(':')[0])));
      expect(uniqueHours.size).toBeGreaterThan(10); // Should have transactions across many hours
      
      // Check for variety in amounts
      const amounts = transactions.map(t => t.amount);
      const minAmount = Math.min(...amounts);
      const maxAmount = Math.max(...amounts);
      expect(maxAmount - minAmount).toBeGreaterThan(500000); // Good spread in amounts
      
      // Check for variety in sender names
      const uniqueSenders = new Set(transactions.map(t => t.senderName));
      expect(uniqueSenders.size).toBeGreaterThan(20); // Should use many different names
    });
  });
});