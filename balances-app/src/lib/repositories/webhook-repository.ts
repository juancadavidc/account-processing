import { createClient } from '@supabase/supabase-js';
import { parseBancolombiaSMS, validateWebhookPayload } from '../sms-parser';
import { parseV2WebhookPayload, formatValidationErrors } from '../v2-validation';
import { V2DatabaseService } from '../v2-database';
import { TransactionDatabase, ParseErrorDatabase } from '../database';
import { logger } from '../logger';
import { 
  IWebhookRepository, 
  ITransactionRepository, 
  ISourceRepository, 
  IParseErrorRepository 
} from './interfaces';
import { 
  WebhookRequest, 
  V2WebhookRequest, 
  Transaction, 
  V2Transaction, 
  ParseError, 
  Source, 
  UserSource, 
  SourceType 
} from '../types';

export class WebhookRepository implements IWebhookRepository {
  private supabaseUrl: string;
  private supabaseServiceKey: string;
  private transactionRepo: ITransactionRepository;
  private sourceRepo: ISourceRepository;
  private parseErrorRepo: IParseErrorRepository;

  constructor(
    supabaseUrl: string,
    supabaseServiceKey: string,
    transactionRepo: ITransactionRepository,
    sourceRepo: ISourceRepository,
    parseErrorRepo: IParseErrorRepository
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseServiceKey = supabaseServiceKey;
    this.transactionRepo = transactionRepo;
    this.sourceRepo = sourceRepo;
    this.parseErrorRepo = parseErrorRepo;
  }

  async processSMSWebhook(webhookData: WebhookRequest): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    isDuplicate?: boolean;
  }> {
    try {
      // Check for duplicate webhookId
      const existingTransaction = await this.transactionRepo.getTransactionByWebhookId(webhookData.webhookId);
      if (existingTransaction) {
        return {
          success: true,
          transactionId: existingTransaction.id,
          isDuplicate: true
        };
      }

      // Parse SMS message
      const parsedMessage = parseBancolombiaSMS(webhookData.message);
      
      if (!parsedMessage.success) {
        // Log parse error
        await this.parseErrorRepo.createParseError({
          rawMessage: webhookData.message,
          errorReason: parsedMessage.errorReason || 'Unknown parsing error',
          webhookId: webhookData.webhookId
        });

        return {
          success: false,
          error: `Parse failed: ${parsedMessage.errorReason}`
        };
      }

      // Create transaction
      const transaction = await this.transactionRepo.createTransaction({
        amount: parsedMessage.amount,
        currency: 'COP',
        senderName: parsedMessage.senderName,
        accountNumber: parsedMessage.account,
        transactionDate: parsedMessage.date,
        transactionTime: parsedMessage.time,
        rawMessage: webhookData.message,
        webhookId: webhookData.webhookId,
        status: 'processed'
      });

      if (!transaction) {
        return {
          success: false,
          error: 'Failed to create transaction'
        };
      }

      return {
        success: true,
        transactionId: transaction.id
      };

    } catch (error) {
      logger.error('SMS webhook processing failed', {
        webhookId: webhookData.webhookId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Internal processing error'
      };
    }
  }

  async processV2Webhook(webhookData: V2WebhookRequest): Promise<{
    success: boolean;
    transactionId?: string;
    sourceId?: string;
    error?: string;
    isDuplicate?: boolean;
  }> {
    try {
      // Determine source type from sourceTo value
      let sourceType: SourceType;
      if (webhookData.sourceTo.includes('@')) {
        sourceType = 'email';
      } else if (webhookData.sourceTo.startsWith('+')) {
        sourceType = 'phone';
      } else {
        sourceType = 'webhook';
      }

      // Find or create the source
      const { data: source, error: sourceError } = await this.sourceRepo.findOrCreateSource(
        sourceType, 
        webhookData.sourceTo
      );

      if (sourceError || !source) {
        logger.error('Failed to find/create source', { 
          sourceType, 
          sourceTo: webhookData.sourceTo, 
          error: sourceError?.message 
        });
        return {
          success: false,
          error: 'Failed to process source'
        };
      }

      // Check if any users have this source configured
      const { data: userIds, error: usersError } = await this.sourceRepo.getUsersForSource(source.id);
      
      if (usersError) {
        logger.error('Failed to get users for source', { 
          sourceId: source.id, 
          error: usersError.message 
        });
        return {
          success: false,
          error: 'Failed to find users for source'
        };
      }

      if (userIds.length === 0) {
        logger.warn('No users configured for source', { 
          sourceId: source.id, 
          sourceTo: webhookData.sourceTo 
        });
        return {
          success: false,
          error: 'No users configured for this source'
        };
      }

      // Create the transaction
      const transaction = await this.transactionRepo.createV2Transaction(source.id, webhookData);

      if (!transaction) {
        // Check if it's a duplicate
        const existingTransaction = await this.transactionRepo.getV2TransactionByWebhookId(webhookData.webhookId);
        if (existingTransaction) {
          return {
            success: true,
            transactionId: existingTransaction.id,
            sourceId: source.id,
            isDuplicate: true
          };
        }

        return {
          success: false,
          error: 'Failed to create transaction'
        };
      }

      return {
        success: true,
        transactionId: transaction.id,
        sourceId: source.id
      };

    } catch (error) {
      logger.error('V2 webhook processing failed', {
        webhookId: webhookData.webhookId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Internal processing error'
      };
    }
  }

  async logParseError(data: {
    rawMessage: string;
    errorReason: string;
    webhookId: string;
  }): Promise<ParseError | null> {
    return await this.parseErrorRepo.createParseError(data);
  }
}

