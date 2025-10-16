import { createClientComponentClient } from './supabase'
import { transformTransaction } from './database'
import { Transaction, DatabaseTransaction } from './types'
import { RealtimeChannel } from '@supabase/supabase-js'

export class RealtimeSubscriptions {
  private supabase = createClientComponentClient()
  private channels: Record<string, RealtimeChannel> = {}

  // Subscribe to new transactions
  subscribeToTransactions(callback: (transaction: Transaction) => void) {
    const channelName = 'transactions-realtime'
    
    // Remove existing channel if it exists
    if (this.channels[channelName]) {
      this.supabase.removeChannel(this.channels[channelName])
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          try {
            const newTransaction = transformTransaction(payload.new as DatabaseTransaction)
            callback(newTransaction)
          } catch (error) {
            console.error('Error processing real-time transaction:', error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to transaction updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to transaction updates')
        }
      })

    this.channels[channelName] = channel
    return channelName
  }

  // Subscribe to transaction updates (for status changes)
  subscribeToTransactionUpdates(callback: (transaction: Transaction) => void) {
    const channelName = 'transactions-updates'
    
    // Remove existing channel if it exists
    if (this.channels[channelName]) {
      this.supabase.removeChannel(this.channels[channelName])
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          try {
            const updatedTransaction = transformTransaction(payload.new as DatabaseTransaction)
            callback(updatedTransaction)
          } catch (error) {
            console.error('Error processing real-time transaction update:', error)
          }
        }
      )
      .subscribe()

    this.channels[channelName] = channel
    return channelName
  }

  // Unsubscribe from a specific channel
  unsubscribe(channelName: string) {
    if (this.channels[channelName]) {
      this.supabase.removeChannel(this.channels[channelName])
      delete this.channels[channelName]
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    Object.keys(this.channels).forEach(channelName => {
      this.unsubscribe(channelName)
    })
  }
}

// React hook for using real-time subscriptions
export function useTransactionRealtime(
  onNewTransaction: (transaction: Transaction) => void,
  onTransactionUpdate?: (transaction: Transaction) => void
) {
  const subscriptions = new RealtimeSubscriptions()

  // Subscribe on mount
  const subscribe = () => {
    subscriptions.subscribeToTransactions(onNewTransaction)
    
    if (onTransactionUpdate) {
      subscriptions.subscribeToTransactionUpdates(onTransactionUpdate)
    }
  }

  // Cleanup function
  const unsubscribe = () => {
    subscriptions.unsubscribeAll()
  }

  return { subscribe, unsubscribe }
}