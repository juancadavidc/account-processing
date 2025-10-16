export interface Transaction {
  id: string;                    // UUID primary key
  amount: number;               // Numeric amount for calculations
  currency: string;             // "COP" for Colombian Peso
  senderName: string;          // Parsed sender name from SMS
  accountNumber: string;       // Last 4 digits (e.g., "**7251")
  date: Date;                  // Transaction date
  time: string;                // Transaction time (HH:mm format)
  rawMessage: string;          // Original SMS message
  parsedAt: Date;              // When parsing occurred
  webhookId: string;           // Unique webhook identifier
  status: 'processed' | 'failed' | 'duplicate';
}

export interface ParseError {
  id: string;                    // UUID primary key
  rawMessage: string;           // Original SMS that failed parsing
  errorReason: string;          // Specific parsing error message
  webhookId: string;            // Associated webhook ID
  occurredAt: Date;             // When error occurred
  resolved: boolean;            // Manual resolution status
}

// Database row types (snake_case as returned from Supabase)
export interface DatabaseTransaction {
  id: string;
  amount: string;               // DECIMAL comes as string from database
  currency: string;
  sender_name: string;
  account_number: string;
  transaction_date: string;     // DATE comes as string
  transaction_time: string;     // TIME comes as string
  raw_message: string;
  parsed_at: string;            // TIMESTAMP comes as string
  webhook_id: string;
  status: string;
  created_at: string;           // TIMESTAMP comes as string
}

export interface DatabaseParseError {
  id: string;
  raw_message: string;
  error_reason: string;
  webhook_id: string;
  occurred_at: string;          // TIMESTAMP comes as string
  resolved: boolean;
}

export interface DashboardMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  totalAmount: number;         // Sum of all amounts in period
  transactionCount: number;    // Count of transactions
  averageAmount: number;       // Average transaction amount
  periodStart: Date;           // Period start boundary
  periodEnd: Date;             // Period end boundary
  lastUpdated: Date;           // Cache invalidation timestamp
}

export interface MetricCard {
  title: string;
  value: number;
  currency: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  period: 'daily' | 'weekly' | 'monthly' | 'average';
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
  amount?: number;
}

export interface DashboardFilters {
  startDate: Date | null;
  endDate: Date | null;
  searchTerm: string;
  accountFilter: string;
  senderFilter: string;
}

export interface DashboardState {
  transactions: Transaction[];
  metrics: MetricCard[];
  filters: DashboardFilters;
  isLoading: boolean;
  error: string | null;
}

// Webhook endpoint types
export interface WebhookRequest {
  message: string;
  timestamp: string;
  phone: string;
  webhookId: string;
}

export interface WebhookResponse {
  status: 'processed' | 'error' | 'duplicate';
  transactionId?: string;
  webhookId: string;
  error?: string;
}

export interface ParsedMessage {
  amount: number;
  senderName: string;
  account: string;
  date: Date;
  time: string;
  success: boolean;
  errorReason?: string;
}

// ========================================
// V2 API Types - New structured webhook API
// ========================================

export interface V2WebhookRequest {
  source: string;           // "bancolombia", "nequi", "daviplata"
  timestamp: string;        // ISO 8601 format
  sourceFrom: string;       // "bancolombia@noreply.com", "+573001234567"
  sourceTo: string;         // "jdcadavid96@gmail.com", "+573009876543"
  event: string;           // "deposit", "withdrawal", "transfer"
  message: string;         // Original message content
  amount: number;          // Numeric amount (190000)
  currency?: string;       // "COP" (optional, defaults to COP)
  webhookId: string;       // Unique identifier
  metadata?: {             // Optional additional data
    accountNumber?: string;
    senderName?: string;
    reference?: string;
    [key: string]: any;    // Allow additional fields
  };
}

export interface V2WebhookResponse {
  status: 'processed' | 'error' | 'duplicate';
  transactionId?: string;
  webhookId: string;
  error?: string;
  sourceId?: string;       // ID of the matched source
}

// Source Management Types
export interface Source {
  id: string;
  sourceType: 'email' | 'phone' | 'webhook';
  sourceValue: string;     // The actual email/phone/webhook URL
  createdAt: Date;
}

export interface DatabaseSource {
  id: string;
  source_type: string;
  source_value: string;
  created_at: string;
}

export interface UserSource {
  id: string;
  userId: string;
  sourceId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface DatabaseUserSource {
  id: string;
  user_id: string;
  source_id: string;
  is_active: boolean;
  created_at: string;
}

// Updated Transaction types for V2
export interface V2Transaction extends Omit<Transaction, 'status'> {
  sourceId: string;        // Reference to source table
  event: string;          // "deposit", "withdrawal", "transfer"
  status: 'processed' | 'failed' | 'duplicate' | 'pending';
}

export interface DatabaseV2Transaction {
  id: string;
  source_id: string;
  amount: string;
  currency: string;
  sender_name: string;
  account_number: string;
  transaction_date: string;
  transaction_time: string;
  raw_message: string;
  parsed_at: string;
  webhook_id: string;
  event: string;
  status: string;
  created_at: string;
}

// Event types enum
export type TransactionEvent = 'deposit' | 'withdrawal' | 'transfer';
export type SourceType = 'email' | 'phone' | 'webhook';

// V2 Dashboard types
export interface V2DashboardState extends Omit<DashboardState, 'transactions'> {
  transactions: V2Transaction[];
  sources: Source[];
}