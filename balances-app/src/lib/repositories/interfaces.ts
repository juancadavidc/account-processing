import { 
  Transaction, 
  V2Transaction, 
  ParseError, 
  Source, 
  UserSource, 
  V2WebhookRequest, 
  WebhookRequest,
  SourceType 
} from '../types';

// ========================================
// Repository Interfaces
// ========================================

export interface IWebhookRepository {
  // V1 SMS Webhook operations
  processSMSWebhook(webhookData: WebhookRequest): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    isDuplicate?: boolean;
  }>;

  // V2 Structured Webhook operations
  processV2Webhook(webhookData: V2WebhookRequest): Promise<{
    success: boolean;
    transactionId?: string;
    sourceId?: string;
    error?: string;
    isDuplicate?: boolean;
  }>;

  // Parse error handling
  logParseError(data: {
    rawMessage: string;
    errorReason: string;
    webhookId: string;
  }): Promise<ParseError | null>;
}

export interface ITransactionRepository {
  // Transaction CRUD operations
  createTransaction(data: {
    amount: number;
    currency: string;
    senderName: string;
    accountNumber: string;
    transactionDate: Date;
    transactionTime: string;
    rawMessage: string;
    webhookId: string;
    status?: 'processed' | 'failed' | 'duplicate';
  }): Promise<Transaction | null>;

  createV2Transaction(sourceId: string, webhookData: V2WebhookRequest): Promise<V2Transaction | null>;

  getTransactionByWebhookId(webhookId: string): Promise<Transaction | null>;
  getV2TransactionByWebhookId(webhookId: string): Promise<V2Transaction | null>;

  getTransactions(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    searchTerm?: string;
    amountRange?: { min?: number; max?: number };
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]>;

  getV2TransactionsForUser(userId: string, limit?: number, offset?: number): Promise<V2Transaction[]>;

  // Metrics and analytics
  getTransactionMetrics(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    lastUpdated: Date;
  }>;

  getDetailedMetrics(period: 'daily' | 'weekly' | 'monthly', referenceDate?: Date): Promise<{
    period: string;
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    lastUpdated: Date;
  }>;

  getTransactionStatusCounts(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<Record<string, number>>;
}

export interface ISourceRepository {
  // Source management
  findOrCreateSource(sourceType: SourceType, sourceValue: string): Promise<{
    data: Source | null;
    error: Error | null;
  }>;

  getSourceById(sourceId: string): Promise<{
    data: Source | null;
    error: Error | null;
  }>;

  getSourcesForUser(userId: string): Promise<{
    data: Source[];
    error: Error | null;
  }>;

  // User-Source associations
  getUsersForSource(sourceId: string): Promise<{
    data: string[];
    error: Error | null;
  }>;

  addUserSource(userId: string, sourceId: string): Promise<{
    data: UserSource | null;
    error: Error | null;
  }>;

  removeUserSource(userId: string, sourceId: string): Promise<{
    error: Error | null;
  }>;
}

export interface IParseErrorRepository {
  // Parse error management
  createParseError(data: {
    rawMessage: string;
    errorReason: string;
    webhookId: string;
  }): Promise<ParseError | null>;

  getParseErrors(filters: {
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ParseError[]>;

  resolveParseError(id: string): Promise<ParseError | null>;
}

// ========================================
// Service Interfaces
// ========================================

export interface IWebhookService {
  // Webhook processing orchestration
  processWebhook(webhookData: WebhookRequest | V2WebhookRequest, version: 'v1' | 'v2'): Promise<{
    success: boolean;
    transactionId?: string;
    sourceId?: string;
    error?: string;
    isDuplicate?: boolean;
  }>;

  // Validation and security
  validateWebhookRequest(request: Request): Promise<{
    isValid: boolean;
    webhookData?: WebhookRequest | V2WebhookRequest;
    error?: string;
  }>;

  // Rate limiting and security checks
  checkRateLimit(clientIP: string): Promise<boolean>;
  validateTimestamp(timestamp: string, maxAgeMinutes: number): Promise<boolean>;
  validateAuthToken(token: string): Promise<boolean>;
}

