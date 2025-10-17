import { createClient } from '@supabase/supabase-js';
import { TransactionDatabase } from '../database';
import { V2DatabaseService } from '../v2-database';
import { ITransactionRepository } from './interfaces';
import { 
  Transaction, 
  V2Transaction, 
  V2WebhookRequest 
} from '../types';

export class TransactionRepository implements ITransactionRepository {
  private supabaseUrl: string;
  private supabaseServiceKey: string;
  private v2DatabaseService: V2DatabaseService;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseServiceKey = supabaseServiceKey;
    this.v2DatabaseService = new V2DatabaseService(supabaseUrl, supabaseServiceKey);
  }

  async createTransaction(data: {
    amount: number;
    currency: string;
    senderName: string;
    accountNumber: string;
    transactionDate: Date;
    transactionTime: string;
    rawMessage: string;
    webhookId: string;
    status?: 'processed' | 'failed' | 'duplicate';
  }): Promise<Transaction | null> {
    try {
      return await TransactionDatabase.insertTransaction(data);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      return null;
    }
  }

  async createV2Transaction(sourceId: string, webhookData: V2WebhookRequest): Promise<V2Transaction | null> {
    try {
      const { data: transaction, error } = await this.v2DatabaseService.createV2Transaction(sourceId, webhookData);
      
      if (error) {
        if (error.message.includes('Duplicate webhook ID')) {
          // Return null to indicate duplicate, let the caller handle it
          return null;
        }
        throw error;
      }

      return transaction;
    } catch (error) {
      console.error('Failed to create V2 transaction:', error);
      return null;
    }
  }

  async getTransactionByWebhookId(webhookId: string): Promise<Transaction | null> {
    try {
      return await TransactionDatabase.getTransactionByWebhookId(webhookId);
    } catch (error) {
      console.error('Failed to get transaction by webhook ID:', error);
      return null;
    }
  }

  async getV2TransactionByWebhookId(webhookId: string): Promise<V2Transaction | null> {
    try {
      // Create a temporary client to check for existing V2 transaction
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { data, error } = await supabase
        .from('v2_transactions')
        .select('*')
        .eq('webhook_id', webhookId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw error;
      }

      // Transform database row to V2Transaction
      return {
        id: data.id,
        sourceId: data.source_id,
        amount: parseFloat(data.amount),
        currency: data.currency,
        senderName: data.sender_name || '',
        accountNumber: data.account_number || '',
        date: new Date(data.transaction_date + 'T' + data.transaction_time),
        time: data.transaction_time,
        rawMessage: data.raw_message,
        parsedAt: new Date(data.parsed_at),
        webhookId: data.webhook_id,
        event: data.event,
        status: data.status as 'processed' | 'failed' | 'duplicate' | 'pending'
      };
    } catch (error) {
      console.error('Failed to get V2 transaction by webhook ID:', error);
      return null;
    }
  }

  async getTransactions(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    searchTerm?: string;
    amountRange?: { min?: number; max?: number };
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    try {
      return await TransactionDatabase.getTransactions(filters);
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }

  async getV2TransactionsForUser(userId: string, limit = 100, offset = 0): Promise<V2Transaction[]> {
    try {
      const { data: transactions, error } = await this.v2DatabaseService.getTransactionsForUser(userId, limit, offset);
      
      if (error) {
        console.error('Failed to get V2 transactions for user:', error);
        return [];
      }

      return transactions;
    } catch (error) {
      console.error('Failed to get V2 transactions for user:', error);
      return [];
    }
  }

  async getTransactionMetrics(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    lastUpdated: Date;
  }> {
    try {
      return await TransactionDatabase.getTransactionMetrics(filters);
    } catch (error) {
      console.error('Failed to get transaction metrics:', error);
      return {
        totalAmount: 0,
        transactionCount: 0,
        averageAmount: 0,
        lastUpdated: new Date()
      };
    }
  }

  async getDetailedMetrics(period: 'daily' | 'weekly' | 'monthly', referenceDate = new Date()): Promise<{
    period: string;
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    lastUpdated: Date;
  }> {
    try {
      return await TransactionDatabase.getDetailedMetrics(period, referenceDate);
    } catch (error) {
      console.error('Failed to get detailed metrics:', error);
      return {
        period,
        periodStart: referenceDate,
        periodEnd: referenceDate,
        totalAmount: 0,
        transactionCount: 0,
        averageAmount: 0,
        lastUpdated: new Date()
      };
    }
  }

  async getTransactionStatusCounts(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<Record<string, number>> {
    try {
      return await TransactionDatabase.getTransactionStatusCounts(filters);
    } catch (error) {
      console.error('Failed to get transaction status counts:', error);
      return {};
    }
  }
}

