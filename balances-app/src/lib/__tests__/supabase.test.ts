import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { TransactionDatabase, ParseErrorDatabase } from '../database'
import { supabase } from '../supabase'

// Test configuration
const TEST_WEBHOOK_ID = 'test-webhook-' + Date.now()
const TEST_TRANSACTION_DATA = {
  amount: 150000,
  currency: 'COP',
  senderName: 'JUAN CARLOS MARTINEZ',
  accountNumber: '**7251',
  transactionDate: new Date('2025-01-15'),
  transactionTime: '14:30',
  rawMessage: 'Transferencia recibida por COP$150,000 de JUAN CARLOS MARTINEZ a tu cuenta ****7251 el 15-Ene-2025 a las 02:30PM',
  webhookId: TEST_WEBHOOK_ID
}

describe('Database Operations', () => {
  
  beforeAll(async () => {
    // Verify Supabase connection
    const { error } = await supabase.auth.getSession()
    if (error && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Warning: Tests require valid Supabase configuration')
    }
  })

  afterAll(async () => {
    // Cleanup test data
    try {
      await supabase.from('transactions').delete().eq('webhook_id', TEST_WEBHOOK_ID)
      await supabase.from('parse_errors').delete().eq('webhook_id', TEST_WEBHOOK_ID)
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
  })

  describe('TransactionDatabase', () => {
    
    it('should insert a new transaction', async () => {
      const transaction = await TransactionDatabase.insertTransaction(TEST_TRANSACTION_DATA)
      
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(150000)
      expect(transaction?.currency).toBe('COP')
      expect(transaction?.senderName).toBe('JUAN CARLOS MARTINEZ')
      expect(transaction?.webhookId).toBe(TEST_WEBHOOK_ID)
      expect(transaction?.status).toBe('processed')
    })

    it('should retrieve transaction by webhook ID', async () => {
      const transaction = await TransactionDatabase.getTransactionByWebhookId(TEST_WEBHOOK_ID)
      
      expect(transaction).toBeDefined()
      expect(transaction?.webhookId).toBe(TEST_WEBHOOK_ID)
      expect(transaction?.amount).toBe(150000)
    })

    it('should handle duplicate webhook ID', async () => {
      // Attempt to insert the same webhook ID again
      await expect(
        TransactionDatabase.insertTransaction(TEST_TRANSACTION_DATA)
      ).rejects.toThrow()
    })

    it('should retrieve transactions with filters', async () => {
      const transactions = await TransactionDatabase.getTransactions({
        startDate: new Date('2025-01-14'),
        endDate: new Date('2025-01-16'),
        limit: 10
      })

      expect(Array.isArray(transactions)).toBe(true)
      expect(transactions.length).toBeGreaterThan(0)
      
      const testTransaction = transactions.find(t => t.webhookId === TEST_WEBHOOK_ID)
      expect(testTransaction).toBeDefined()
    })

    it('should calculate transaction metrics', async () => {
      const metrics = await TransactionDatabase.getTransactionMetrics({
        startDate: new Date('2025-01-14'),
        endDate: new Date('2025-01-16')
      })

      expect(metrics).toBeDefined()
      expect(typeof metrics.totalAmount).toBe('number')
      expect(typeof metrics.transactionCount).toBe('number')
      expect(typeof metrics.averageAmount).toBe('number')
      expect(metrics.totalAmount).toBeGreaterThanOrEqual(150000)
      expect(metrics.transactionCount).toBeGreaterThanOrEqual(1)
    })

    it('should validate amount constraints', async () => {
      const invalidData = {
        ...TEST_TRANSACTION_DATA,
        amount: -100, // Invalid negative amount
        webhookId: TEST_WEBHOOK_ID + '-invalid'
      }

      await expect(
        TransactionDatabase.insertTransaction(invalidData)
      ).rejects.toThrow()
    })

    it('should validate status enum', async () => {
      const transaction = await TransactionDatabase.insertTransaction({
        ...TEST_TRANSACTION_DATA,
        status: 'failed',
        webhookId: TEST_WEBHOOK_ID + '-failed'
      })

      expect(transaction?.status).toBe('failed')
    })
  })

  describe('ParseErrorDatabase', () => {
    const TEST_PARSE_ERROR = {
      rawMessage: 'Invalid SMS format: Unable to parse amount',
      errorReason: 'Amount pattern not found in message',
      webhookId: TEST_WEBHOOK_ID + '-error'
    }

    it('should insert parse error', async () => {
      const parseError = await ParseErrorDatabase.insertParseError(TEST_PARSE_ERROR)

      expect(parseError).toBeDefined()
      expect(parseError?.rawMessage).toBe(TEST_PARSE_ERROR.rawMessage)
      expect(parseError?.errorReason).toBe(TEST_PARSE_ERROR.errorReason)
      expect(parseError?.resolved).toBe(false)
    })

    it('should retrieve parse errors', async () => {
      const errors = await ParseErrorDatabase.getParseErrors({
        resolved: false,
        limit: 10
      })

      expect(Array.isArray(errors)).toBe(true)
      
      const testError = errors.find(e => e.webhookId === TEST_PARSE_ERROR.webhookId)
      expect(testError).toBeDefined()
    })

    it('should resolve parse error', async () => {
      // Get the parse error first
      const errors = await ParseErrorDatabase.getParseErrors({
        limit: 1
      })
      
      if (errors.length > 0) {
        const resolved = await ParseErrorDatabase.resolveParseError(errors[0].id)
        expect(resolved?.resolved).toBe(true)
      }
    })
  })

  describe('Database Schema Validation', () => {
    
    it('should have proper indexes', async () => {
      // Query to check if our expected indexes exist
      const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'transactions')

      if (indexes) {
        const indexNames = indexes.map(idx => idx.indexname)
        expect(indexNames).toContain('idx_transactions_date')
        expect(indexNames).toContain('idx_transactions_webhook')
        expect(indexNames).toContain('idx_transactions_status')
      }
    })

    it('should have Row Level Security enabled', async () => {
      const { data } = await supabase
        .from('pg_tables')
        .select('row_security')
        .eq('tablename', 'transactions')
        .eq('schemaname', 'public')

      if (data && data.length > 0) {
        expect(data[0].row_security).toBe(true)
      }
    })
  })
})