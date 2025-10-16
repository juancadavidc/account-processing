'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/stores/dashboard';

/**
 * Hook to initialize and manage real data for the dashboard
 * Loads real transactions from Supabase and sets up real-time subscriptions
 */
export function useDataLoader() {
  const { 
    fetchTransactions, 
    fetchMetrics, 
    subscribeToRealTime, 
    unsubscribeFromRealTime,
    refreshData,
    loading,
    error,
    realTimeConnected
  } = useDashboardStore();
  
  const isInitializedRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize data loading
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const initializeRealData = async () => {
      try {
        console.log('🚀 Loading real transaction data...');
        
        // Load initial data
        await fetchTransactions();
        await fetchMetrics();
        
        console.log('✅ Initial data loaded successfully');
        
        // Set up real-time subscriptions
        console.log('🔄 Setting up real-time subscriptions...');
        subscribeToRealTime();
        
        // Set up fallback refresh (every 30 seconds when real-time fails)
        const setupFallbackRefresh = () => {
          fallbackIntervalRef.current = setInterval(async () => {
            if (!realTimeConnected) {
              console.log('📡 Real-time disconnected, refreshing data...');
              try {
                await refreshData();
                console.log('✅ Fallback refresh successful');
              } catch (fallbackError) {
                console.error('❌ Fallback refresh failed:', fallbackError);
              }
            }
          }, 30000);
        };
        
        setupFallbackRefresh();
        
        // Reset reconnection attempts on successful initialization
        reconnectAttemptsRef.current = 0;
        
      } catch (error) {
        console.error('❌ Failed to initialize real data:', error);
        
        // Exponential backoff retry with max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const backoffDelay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          console.log(`🔄 Retrying data initialization (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${backoffDelay}ms...`);
          
          retryTimeoutRef.current = setTimeout(() => {
            initializeRealData();
          }, backoffDelay);
        } else {
          console.error('❌ Max reconnection attempts reached. Manual refresh required.');
          // Could emit an event here or update a global error state
        }
      }
    };

    initializeRealData();
    isInitializedRef.current = true;

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up data loader...');
      unsubscribeFromRealTime();
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [fetchTransactions, fetchMetrics, subscribeToRealTime, unsubscribeFromRealTime, refreshData, realTimeConnected]);

  // Handle real-time reconnection with exponential backoff
  useEffect(() => {
    if (!realTimeConnected && isInitializedRef.current) {
      console.log('⚠️ Real-time connection lost, attempting reconnection...');
      
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const backoffDelay = Math.min(3000 * Math.pow(1.5, reconnectAttemptsRef.current), 15000);
        reconnectAttemptsRef.current++;
        
        console.log(`🔄 Real-time reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${backoffDelay}ms...`);
        
        retryTimeoutRef.current = setTimeout(() => {
          try {
            subscribeToRealTime();
            // Reset attempts on successful reconnection (will be handled by connection status change)
            if (realTimeConnected) {
              reconnectAttemptsRef.current = 0;
            }
          } catch (error) {
            console.error('❌ Real-time reconnection failed:', error);
          }
        }, backoffDelay);
      } else {
        console.error('❌ Max real-time reconnection attempts reached. Using fallback refresh mode.');
      }
    }
    
    // Reset reconnection attempts when connection is restored
    if (realTimeConnected) {
      reconnectAttemptsRef.current = 0;
    }
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [realTimeConnected, subscribeToRealTime]);

  // Return current state for components to use
  return {
    isLoading: loading,
    error,
    realTimeConnected,
    refreshData: async () => {
      console.log('🔄 Manual data refresh requested...');
      await refreshData();
    }
  };
}