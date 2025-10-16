'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/stores/dashboard';
import { generateMockTransactions, generateRealTimeTransaction } from '@/lib/mock-data';
import { runFullValidation, validateTransaction } from '@/lib/validation';

/**
 * Hook to initialize and manage mock data for the dashboard
 * Loads initial data and sets up real-time simulation
 */
export function useMockDataLoader() {
  const { setTransactions, addTransaction, setLoading, setError } = useDashboardStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (isInitializedRef.current) return;
    
    const initializeMockData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Generate initial mock data
        console.log('🚀 Generating mock transactions...');
        const mockTransactions = generateMockTransactions();
        console.log(`✅ Generated ${mockTransactions.length} mock transactions`);
        
        // Validate all generated transactions
        const { valid, invalid, businessRuleViolations } = runFullValidation(mockTransactions);
        
        if (invalid.length > 0 || businessRuleViolations.length > 0) {
          console.warn(`⚠️ Validation issues found:
            - Invalid transactions: ${invalid.length}
            - Business rule violations: ${businessRuleViolations.length}`);
        }
        
        // Use valid transactions plus violations (they're still processable)
        const usableTransactions = [...valid, ...businessRuleViolations];
        
        // Load transactions into store
        setTransactions(usableTransactions);
        
        // Set up real-time simulation (new transaction every 30-60 seconds)
        const startRealTimeSimulation = () => {
          const randomInterval = Math.random() * 30000 + 30000; // 30-60 seconds
          
          intervalRef.current = setTimeout(() => {
            // 20% chance of adding a new transaction
            if (Math.random() < 0.2) {
              const newTransaction = generateRealTimeTransaction();
              
              // Validate new transaction before adding
              if (validateTransaction(newTransaction)) {
                console.log('📥 Adding real-time transaction:', newTransaction.senderName);
                addTransaction(newTransaction);
              } else {
                console.error('❌ Real-time transaction failed validation, skipping');
              }
            }
            
            startRealTimeSimulation(); // Schedule next update
          }, randomInterval);
        };
        
        startRealTimeSimulation();
        
      } catch (error) {
        console.error('❌ Failed to initialize mock data:', error);
        setError('Failed to load transaction data');
      } finally {
        setLoading(false);
      }
    };

    initializeMockData();
    isInitializedRef.current = true;

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [setTransactions, addTransaction, setLoading, setError]);

  // Return current loading state for components to use
  return {
    isLoading: useDashboardStore(state => state.loading),
    error: useDashboardStore(state => state.error)
  };
}