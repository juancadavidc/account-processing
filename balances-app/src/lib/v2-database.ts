import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  V2WebhookRequest, 
  Source, 
  UserSource, 
  V2Transaction,
  DatabaseSource,
  DatabaseUserSource,
  DatabaseV2Transaction,
  SourceType 
} from './types';

// Database operations for V2 API

export class V2DatabaseService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  // ==========================================
  // Source Management Operations
  // ==========================================

  /**
   * Find or create a source by type and value
   */
  async findOrCreateSource(sourceType: SourceType, sourceValue: string): Promise<{ data: Source | null; error: Error | null }> {
    try {
      // First try to find existing source
      const { data: existingSource, error: findError } = await this.supabase
        .from('sources')
        .select('*')
        .eq('source_type', sourceType)
        .eq('source_value', sourceValue)
        .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
        return { data: null, error: new Error(`Failed to find source: ${findError.message}`) };
      }

      if (existingSource) {
        return { 
          data: this.transformDatabaseSource(existingSource), 
          error: null 
        };
      }

      // Create new source if not found
      const { data: newSource, error: createError } = await this.supabase
        .from('sources')
        .insert({
          source_type: sourceType,
          source_value: sourceValue
        })
        .select('*')
        .single();

      if (createError) {
        return { data: null, error: new Error(`Failed to create source: ${createError.message}`) };
      }

      return { 
        data: this.transformDatabaseSource(newSource), 
        error: null 
      };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error in findOrCreateSource') 
      };
    }
  }

  /**
   * Get source by ID
   */
  async getSourceById(sourceId: string): Promise<{ data: Source | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new Error('Source not found') };
        }
        return { data: null, error: new Error(`Failed to get source: ${error.message}`) };
      }

      return { 
        data: this.transformDatabaseSource(data), 
        error: null 
      };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error in getSourceById') 
      };
    }
  }

  /**
   * Get users who have access to a source
   */
  async getUsersForSource(sourceId: string): Promise<{ data: string[]; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('user_sources')
        .select('user_id')
        .eq('source_id', sourceId)
        .eq('is_active', true);

      if (error) {
        return { data: [], error: new Error(`Failed to get users for source: ${error.message}`) };
      }

      return { 
        data: data.map(row => row.user_id), 
        error: null 
      };
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error : new Error('Unknown error in getUsersForSource') 
      };
    }
  }

  /**
   * Get sources for a user
   */
  async getSourcesForUser(userId: string): Promise<{ data: Source[]; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('user_sources')
        .select(`
          sources (
            id,
            source_type,
            source_value,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        return { data: [], error: new Error(`Failed to get sources for user: ${error.message}`) };
      }

      const sources = data
        .map(row => row.sources)
        .filter(source => source !== null)
        .map(source => this.transformDatabaseSource(source as DatabaseSource));

      return { data: sources, error: null };
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error : new Error('Unknown error in getSourcesForUser') 
      };
    }
  }

  // ==========================================
  // User-Source Association Operations
  // ==========================================

  /**
   * Associate a user with a source
   */
  async addUserSource(userId: string, sourceId: string): Promise<{ data: UserSource | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('user_sources')
        .insert({
          user_id: userId,
          source_id: sourceId,
          is_active: true
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { data: null, error: new Error('User is already associated with this source') };
        }
        return { data: null, error: new Error(`Failed to add user source: ${error.message}`) };
      }

      return { 
        data: this.transformDatabaseUserSource(data), 
        error: null 
      };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error in addUserSource') 
      };
    }
  }

  /**
   * Remove user-source association (deactivate)
   */
  async removeUserSource(userId: string, sourceId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('user_sources')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('source_id', sourceId);

      if (error) {
        return { error: new Error(`Failed to remove user source: ${error.message}`) };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error in removeUserSource') 
      };
    }
  }

  // ==========================================
  // Transaction Operations
  // ==========================================

  /**
   * Create a V2 transaction
   */
  async createV2Transaction(
    sourceId: string, 
    webhookData: V2WebhookRequest
  ): Promise<{ data: V2Transaction | null; error: Error | null }> {
    try {
      // Check for duplicate webhook ID
      const { data: existingTransaction, error: duplicateError } = await this.supabase
        .from('v2_transactions')
        .select('id, webhook_id')
        .eq('webhook_id', webhookData.webhookId)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        return { data: null, error: new Error(`Failed to check for duplicates: ${duplicateError.message}`) };
      }

      if (existingTransaction) {
        return { data: null, error: new Error('Duplicate webhook ID') };
      }

      // Extract date and time from timestamp
      const timestamp = new Date(webhookData.timestamp);
      const transactionDate = timestamp.toISOString().split('T')[0];
      const transactionTime = timestamp.toTimeString().split(' ')[0];

      const transactionData = {
        source_id: sourceId,
        amount: webhookData.amount.toString(),
        currency: webhookData.currency || 'COP',
        sender_name: webhookData.metadata?.senderName || null,
        account_number: webhookData.metadata?.accountNumber || null,
        transaction_date: transactionDate,
        transaction_time: transactionTime,
        raw_message: webhookData.message,
        webhook_id: webhookData.webhookId,
        event: webhookData.event,
        status: 'processed'
      };

      const { data: insertedTransaction, error: insertError } = await this.supabase
        .from('v2_transactions')
        .insert(transactionData)
        .select('*')
        .single();

      if (insertError) {
        return { data: null, error: new Error(`Failed to insert transaction: ${insertError.message}`) };
      }

      return { 
        data: this.transformDatabaseV2Transaction(insertedTransaction), 
        error: null 
      };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error in createV2Transaction') 
      };
    }
  }

  /**
   * Get transactions for a user
   */
  async getTransactionsForUser(
    userId: string, 
    limit = 100, 
    offset = 0
  ): Promise<{ data: V2Transaction[]; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('v2_transactions')
        .select(`
          *,
          sources!inner (
            id,
            source_type,
            source_value
          )
        `)
        .in('source_id', 
          this.supabase
            .from('user_sources')
            .select('source_id')
            .eq('user_id', userId)
            .eq('is_active', true)
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { data: [], error: new Error(`Failed to get transactions: ${error.message}`) };
      }

      const transactions = data.map(row => this.transformDatabaseV2Transaction(row));
      return { data: transactions, error: null };
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error : new Error('Unknown error in getTransactionsForUser') 
      };
    }
  }

  // ==========================================
  // Data Transformation Helpers
  // ==========================================

  private transformDatabaseSource(dbSource: DatabaseSource): Source {
    return {
      id: dbSource.id,
      sourceType: dbSource.source_type as SourceType,
      sourceValue: dbSource.source_value,
      createdAt: new Date(dbSource.created_at)
    };
  }

  private transformDatabaseUserSource(dbUserSource: DatabaseUserSource): UserSource {
    return {
      id: dbUserSource.id,
      userId: dbUserSource.user_id,
      sourceId: dbUserSource.source_id,
      isActive: dbUserSource.is_active,
      createdAt: new Date(dbUserSource.created_at)
    };
  }

  private transformDatabaseV2Transaction(dbTransaction: DatabaseV2Transaction): V2Transaction {
    return {
      id: dbTransaction.id,
      sourceId: dbTransaction.source_id,
      amount: parseFloat(dbTransaction.amount),
      currency: dbTransaction.currency,
      senderName: dbTransaction.sender_name || '',
      accountNumber: dbTransaction.account_number || '',
      date: new Date(dbTransaction.transaction_date + 'T' + dbTransaction.transaction_time),
      time: dbTransaction.transaction_time,
      rawMessage: dbTransaction.raw_message,
      parsedAt: new Date(dbTransaction.parsed_at),
      webhookId: dbTransaction.webhook_id,
      event: dbTransaction.event,
      status: dbTransaction.status as 'processed' | 'failed' | 'duplicate' | 'pending'
    };
  }
}