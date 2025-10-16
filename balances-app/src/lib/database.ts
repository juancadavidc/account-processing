import { supabase, createServerClient, createClientComponentClient } from './supabase'
import { Transaction, ParseError, DatabaseTransaction, DatabaseParseError, V2Transaction, DatabaseV2Transaction } from './types'
import { cache, createCacheKey, CacheKeys } from './cache'

// Transform database row to application interface
export function transformTransaction(dbRow: DatabaseTransaction): Transaction {
  return {
    id: dbRow.id,
    amount: parseFloat(dbRow.amount),
    currency: dbRow.currency,
    senderName: dbRow.sender_name,
    accountNumber: dbRow.account_number,
    date: new Date(dbRow.transaction_date),
    time: dbRow.transaction_time,
    rawMessage: dbRow.raw_message,
    parsedAt: new Date(dbRow.parsed_at),
    webhookId: dbRow.webhook_id,
    status: dbRow.status as 'processed' | 'failed' | 'duplicate'
  }
}

// Transform V2 database row to application interface
export function transformV2Transaction(dbRow: DatabaseV2Transaction): Transaction {
  return {
    id: dbRow.id,
    amount: parseFloat(dbRow.amount),
    currency: dbRow.currency,
    senderName: dbRow.sender_name || '',
    accountNumber: dbRow.account_number || '',
    date: new Date(dbRow.transaction_date + 'T' + dbRow.transaction_time),
    time: dbRow.transaction_time,
    rawMessage: dbRow.raw_message,
    parsedAt: new Date(dbRow.parsed_at),
    webhookId: dbRow.webhook_id,
    status: dbRow.status as 'processed' | 'failed' | 'duplicate'
  }
}

export function transformParseError(dbRow: DatabaseParseError): ParseError {
  return {
    id: dbRow.id,
    rawMessage: dbRow.raw_message,
    errorReason: dbRow.error_reason,
    webhookId: dbRow.webhook_id,
    occurredAt: new Date(dbRow.occurred_at),
    resolved: dbRow.resolved
  }
}

// Transaction database operations
export class TransactionDatabase {
  
  // Insert new transaction (webhook usage)
  static async insertTransaction(data: {
    amount: number;
    currency: string;
    senderName: string;
    accountNumber: string;
    transactionDate: Date;
    transactionTime: string;
    rawMessage: string;
    webhookId: string;
    status?: 'processed' | 'failed' | 'duplicate';
  }) {
    const serverClient = createServerClient()
    
    const { data: result, error } = await serverClient
      .from('transactions')
      .insert({
        amount: data.amount.toString(),
        currency: data.currency,
        sender_name: data.senderName,
        account_number: data.accountNumber,
        transaction_date: data.transactionDate.toISOString().split('T')[0],
        transaction_time: data.transactionTime,
        raw_message: data.rawMessage,
        webhook_id: data.webhookId,
        status: data.status || 'processed'
      })
      .select()
      .single()

    if (error) throw error
    return result ? transformTransaction(result) : null
  }

  // Get transactions with filters and pagination (V2 only)
  static async getTransactions(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    searchTerm?: string;
    amountRange?: { min?: number; max?: number };
    limit?: number;
    offset?: number;
  } = {}) {
    // Create cache key for this query
    const cacheKey = createCacheKey('v2_transactions', {
      ...filters,
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString()
    });

    // Check cache first (shorter TTL for transactions with search/filters)
    const ttl = filters.searchTerm || filters.status ? 60000 : 300000; // 1 min vs 5 min
    const cached = cache.get<Transaction[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const client = createClientComponentClient()
    let query = client
      .from('v2_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters.startDate) {
      query = query.gte('transaction_date', filters.startDate.toISOString().split('T')[0])
    }
    
    if (filters.endDate) {
      query = query.lte('transaction_date', filters.endDate.toISOString().split('T')[0])
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.searchTerm && filters.searchTerm.trim()) {
      // Use ilike for case-insensitive search on sender_name
      query = query.ilike('sender_name', `%${filters.searchTerm.trim()}%`)
    }

    if (filters.amountRange) {
      if (filters.amountRange.min !== undefined) {
        query = query.gte('amount', filters.amountRange.min.toString())
      }
      if (filters.amountRange.max !== undefined) {
        query = query.lte('amount', filters.amountRange.max.toString())
      }
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    try {
      // Add timeout to database queries
      const queryPromise = query;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000) // 10 second timeout
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data, error } = result as { data: DatabaseV2Transaction[] | null; error: Error | null };

      if (error) {
        console.error('Database query error:', error);
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }
      
      const transactions = data ? data.map(transformV2Transaction) : [];
      
      // Cache the result
      cache.set(cacheKey, transactions, ttl);
      
      console.log(`📊 V2 transactions loaded: ${transactions.length} transactions`);
      
      return transactions;
      
    } catch (err: unknown) {
      console.error('Transaction fetch failed:', err);
      
      // Try to return cached data if available
      const fallbackCached = cache.get<Transaction[]>(cacheKey);
      if (fallbackCached) {
        console.log('📦 Returning cached data due to database error');
        return fallbackCached;
      }
      
      throw err;
    }
  }

  // Get single transaction by webhook ID (V2 only)
  static async getTransactionByWebhookId(webhookId: string) {
    const client = createClientComponentClient()
    const { data, error } = await client
      .from('v2_transactions')
      .select('*')
      .eq('webhook_id', webhookId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return data ? transformV2Transaction(data) : null
  }

  // Get transaction metrics for dashboard with database aggregations (V2 only)
  static async getTransactionMetrics(filters: {
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const client = createClientComponentClient()
    let query = client
      .from('v2_transactions')
      .select('amount, transaction_date, status')
      .eq('status', 'processed') // Only include processed transactions

    if (filters.startDate) {
      query = query.gte('transaction_date', filters.startDate.toISOString().split('T')[0])
    }
    
    if (filters.endDate) {
      query = query.lte('transaction_date', filters.endDate.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) throw error
    
    const transactions = data || []
    const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const transactionCount = transactions.length
    const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0

    console.log(`📊 V2 Metrics: ${transactionCount} transactions, total: ${totalAmount}`);

    return {
      totalAmount,
      transactionCount,
      averageAmount,
      lastUpdated: new Date()
    }
  }

  // Get detailed metrics by period (daily, weekly, monthly)
  static async getDetailedMetrics(period: 'daily' | 'weekly' | 'monthly', referenceDate = new Date()) {
    // Check cache first
    const cacheKey = CacheKeys.metrics(`${period}:${referenceDate.toISOString().split('T')[0]}`);
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate date range based on period
    let startDate: Date;
    let endDate: Date;
    
    const ref = new Date(referenceDate);
    
    switch (period) {
      case 'daily':
        startDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
        endDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1);
        break;
      case 'weekly':
        const dayOfWeek = ref.getDay() || 7; // Sunday = 0, make it 7
        startDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dayOfWeek + 1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 7);
        break;
      case 'monthly':
        startDate = new Date(ref.getFullYear(), ref.getMonth(), 1);
        endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
        break;
    }
    
    const metrics = await this.getTransactionMetrics({ startDate, endDate });
    
    const result = {
      period,
      periodStart: startDate,
      periodEnd: endDate,
      ...metrics
    };

    // Cache metrics for 10 minutes
    cache.set(cacheKey, result, 600000);
    
    return result;
  }

  // Get transaction count by status for error tracking (V2 only)
  static async getTransactionStatusCounts(filters: {
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const client = createClientComponentClient()
    let query = client
      .from('v2_transactions')
      .select('status')

    if (filters.startDate) {
      query = query.gte('transaction_date', filters.startDate.toISOString().split('T')[0])
    }
    
    if (filters.endDate) {
      query = query.lte('transaction_date', filters.endDate.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) throw error
    
    const statusCounts = (data || []).reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return statusCounts;
  }
}

// Parse error database operations
export class ParseErrorDatabase {
  
  // Insert parse error (webhook usage)
  static async insertParseError(data: {
    rawMessage: string;
    errorReason: string;
    webhookId: string;
  }) {
    const serverClient = createServerClient()
    
    const { data: result, error } = await serverClient
      .from('parse_errors')
      .insert({
        raw_message: data.rawMessage,
        error_reason: data.errorReason,
        webhook_id: data.webhookId
      })
      .select()
      .single()

    if (error) throw error
    return result ? transformParseError(result) : null
  }

  // Get parse errors with pagination
  static async getParseErrors(filters: {
    resolved?: boolean;
    limit?: number;
    offset?: number;
  } = {}) {
    const client = createClientComponentClient()
    let query = client
      .from('parse_errors')
      .select('*')
      .order('occurred_at', { ascending: false })

    if (typeof filters.resolved === 'boolean') {
      query = query.eq('resolved', filters.resolved)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data ? data.map(transformParseError) : []
  }

  // Mark parse error as resolved
  static async resolveParseError(id: string) {
    const client = createClientComponentClient()
    const { data, error } = await client
      .from('parse_errors')
      .update({ resolved: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data ? transformParseError(data) : null
  }
}