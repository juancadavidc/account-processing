# Architecture Document: Bancolombia Transfer Dashboard

## Overview
Full-stack React dashboard application built with Next.js 14+ for parsing and visualizing Bancolombia bank transfer SMS messages. The architecture supports two development phases: Phase 1 (Frontend + Mocks) and Phase 2 (Backend Integration).

## Technology Stack

### Frontend Stack
- **Framework**: Next.js 14+ with TypeScript
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **Charts**: Recharts library for data visualization
- **Date Handling**: date-fns for date manipulation
- **State Management**: Zustand for client-side state
- **Real-time**: Supabase client with real-time subscriptions (Phase 2)

### Backend Stack (Phase 2)
- **Runtime**: Next.js API Routes deployed as Vercel Edge Functions
- **Database**: PostgreSQL 15+ (Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Monitoring**: Vercel Analytics + Function Logs

### Platform Architecture (Phase 2)
- **Hosting**: Vercel for frontend and serverless functions
- **Database**: Supabase for PostgreSQL + real-time features
- **Deployment**: Vercel Edge Functions for webhook processing
- **Performance**: <100ms webhook response, 1-2s dashboard updates

## Data Models

### Transaction Model
```typescript
interface Transaction {
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
```

### Analytics Model
```typescript
interface DashboardMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  totalAmount: number;         // Sum of all amounts in period
  transactionCount: number;    // Count of transactions
  averageAmount: number;       // Average transaction amount
  periodStart: Date;           // Period start boundary
  periodEnd: Date;             // Period end boundary
  lastUpdated: Date;           // Cache invalidation timestamp
}
```

### Parse Error Model (Phase 2)
```typescript
interface ParseError {
  id: string;
  rawMessage: string;          // Original SMS that failed parsing
  errorReason: string;         // Specific parsing error
  webhookId: string;           // Associated webhook ID
  occurredAt: Date;            // When error occurred
  resolved: boolean;           // Manual resolution status
}
```

## Component Architecture

### Core shadcn/ui Components
- **Card** - Metric display cards for analytics
- **Table** - Transaction listings with sorting/filtering
- **Button** - Action triggers and navigation
- **Input** - Search functionality
- **Select** - Filters and dropdown controls
- **Badge** - Status indicators
- **Dialog** - Transaction details modal
- **Calendar** - Date range picker for filtering

### Custom Component Structure
```
src/
├── components/
│   ├── dashboard/
│   │   ├── MetricsCards.tsx       # Daily/weekly/monthly cards
│   │   ├── TransactionTable.tsx   # Main transaction listing
│   │   ├── ChartsGrid.tsx         # Visualization container
│   │   └── RealTimeIndicator.tsx  # Live update status
│   ├── charts/
│   │   ├── DepositTimeline.tsx    # Line chart for deposits over time
│   │   ├── HourlyPatterns.tsx     # Bar chart by hour
│   │   ├── TopSenders.tsx         # Sender frequency list
│   │   └── DailyComparison.tsx    # Period comparison
│   ├── filters/
│   │   ├── SearchBar.tsx          # Sender name search
│   │   ├── DateRangePicker.tsx    # Date filtering
│   │   └── StatusFilter.tsx       # Transaction status filter
│   └── ui/                        # shadcn/ui components
└── lib/
    ├── utils.ts                   # Utility functions
    ├── constants.ts               # App constants
    └── types.ts                   # TypeScript definitions
```

## Data Processing Architecture

### Message Parsing System
```typescript
// SMS Message Pattern (Bancolombia)
const BANCOLOMBIA_PATTERN = /Bancolombia:\s*Recibiste una transferencia por \$([0-9,]+) de ([A-Z\s]+) en tu cuenta \*\*(\d+), el (\d{2}\/\d{2}\/\d{4}) a las (\d{2}:\d{2})/;

interface ParsedMessage {
  amount: number;      // Extracted and converted to number
  senderName: string;  // Cleaned sender name
  account: string;     // Account last 4 digits
  date: Date;          // Standardized date object
  time: string;        // 24-hour format time
  success: boolean;    // Parsing success status
}
```

### State Management (Zustand)
```typescript
interface DashboardStore {
  // Data State
  transactions: Transaction[];
  metrics: Record<string, DashboardMetrics>;
  loading: boolean;
  error: string | null;
  
  // Filter State
  searchTerm: string;
  dateRange: { start: Date; end: Date };
  statusFilter: string;
  
  // Actions
  addTransaction: (transaction: Transaction) => void;
  updateMetrics: (period: string, metrics: DashboardMetrics) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearError: () => void;
}
```

## Database Schema (Phase 2)

### PostgreSQL Tables
```sql
-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  sender_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(10) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_time TIME NOT NULL,
  raw_message TEXT NOT NULL,
  parsed_at TIMESTAMP DEFAULT NOW(),
  webhook_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'processed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parse errors table
CREATE TABLE parse_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_message TEXT NOT NULL,
  error_reason TEXT NOT NULL,
  webhook_id VARCHAR(255) NOT NULL,
  occurred_at TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_webhook ON transactions(webhook_id);
CREATE INDEX idx_transactions_status ON transactions(status);
```

## API Architecture (Phase 2)

### Webhook Endpoint
```typescript
// /api/webhook/sms
POST /api/webhook/sms
Content-Type: application/json
Authorization: Bearer <webhook-secret>

Request Body:
{
  "message": "Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06",
  "timestamp": "2025-09-05T08:06:30Z",
  "phone": "+573001234567",
  "webhookId": "webhook_12345"
}

Response: 200 OK (< 100ms)
{
  "status": "processed",
  "transactionId": "uuid-here",
  "webhookId": "webhook_12345"
}
```

### Dashboard API Endpoints
```typescript
// Get transactions with filters
GET /api/transactions?search=&dateFrom=&dateTo=&status=&page=1&limit=50

// Get dashboard metrics
GET /api/metrics?period=daily|weekly|monthly

// Real-time endpoint for SSE (optional)
GET /api/realtime/transactions
```

## Real-time Architecture (Phase 2)

### Supabase Realtime Integration
```typescript
// Client-side real-time subscription
const supabase = createClientComponentClient();

useEffect(() => {
  const channel = supabase
    .channel('transactions')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'transactions' },
      (payload) => {
        // Update local state with new transaction
        addTransaction(payload.new as Transaction);
        // Trigger metrics recalculation
        refreshMetrics();
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

## Security Architecture

### Webhook Security
- **Authentication**: Bearer token validation for webhook endpoint
- **Input Validation**: Strict SMS message format validation
- **Rate Limiting**: Prevent webhook abuse
- **CORS**: Restricted to third-party SMS providers only

### Data Privacy
- **PII Protection**: Hash sensitive sender information if required
- **Access Control**: Supabase RLS policies for multi-user scenarios
- **Audit Logging**: Track all data access and modifications

## Performance Requirements

### Response Time Targets
- **Webhook Processing**: < 100ms response to third-party provider
- **Dashboard Load**: < 2 seconds initial load with mock/real data
- **Real-time Updates**: 1-2 second acceptable latency for UI updates
- **Search/Filter**: < 500ms response for table operations

### Scalability Considerations
- **Transaction Volume**: Handle 1000+ transactions without degradation
- **Database Indexing**: Optimize for date-based queries
- **Caching**: Implement metrics caching with TTL
- **Pagination**: Limit table results to 50 items per page

## Development Phases

### Phase 1: Frontend + Mocks
**Goal**: Validate UI/UX with realistic mock data before backend investment

**Mock Data Strategy**:
- Generate realistic Colombian names and amounts
- Simulate real-time updates every 10-30 seconds
- Include various transaction patterns (hourly, daily variations)
- Test with 1000+ mock transactions for performance

**Key Deliverables**:
1. Complete dashboard UI with shadcn/ui components
2. Mock transaction data generator
3. Zustand store with mock real-time updates
4. Responsive design (mobile-first)
5. All filtering, search, and sorting functionality

### Phase 2: Backend Integration
**Goal**: Replace mocks with real webhook integration and database persistence

**Key Deliverables**:
1. PostgreSQL schema and Supabase setup
2. Webhook endpoint with SMS parsing
3. Real-time database subscriptions
4. Error handling and parse failure tracking
5. Authentication and security implementation

## Testing Strategy

### Unit Testing
- **Parsing Logic**: Test SMS message parsing with various formats
- **Data Transformations**: Validate date/currency formatting
- **State Management**: Test Zustand store actions and state updates
- **Component Logic**: Test filtering, search, and sorting functions

### Integration Testing
- **Database Operations**: Test transaction CRUD operations
- **Real-time Subscriptions**: Verify Supabase real-time functionality
- **Webhook Processing**: End-to-end webhook to dashboard flow
- **API Endpoints**: Test all API routes with various scenarios

### Performance Testing
- **Load Testing**: Test with 1000+ transactions
- **Webhook Performance**: Ensure < 100ms response times
- **Real-time Performance**: Verify 1-2 second update latency
- **Mobile Performance**: Test responsive design on actual devices

## Deployment Architecture

### Vercel Configuration
```javascript
// vercel.json
{
  "functions": {
    "app/api/webhook/sms.ts": {
      "maxDuration": 10
    }
  },
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_ANON_KEY": "@supabase-anon-key",
    "WEBHOOK_SECRET": "@webhook-secret"
  }
}
```

### Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret-here

# Development
NEXT_PUBLIC_APP_ENV=development|production
```

## Monitoring and Observability

### Logging Strategy
- **Webhook Logs**: All incoming webhook requests and processing results
- **Parse Errors**: Failed SMS parsing attempts with details
- **Performance Logs**: Response times for critical operations
- **Error Tracking**: Application errors and stack traces

### Metrics to Track
- **Business Metrics**: Transaction volume, amounts, sender patterns
- **Technical Metrics**: Webhook response times, parsing success rate
- **Performance Metrics**: Dashboard load times, real-time update latency
- **Error Metrics**: Failed webhooks, parse errors, system errors

## File Structure

```
bancolombia-balances/
├── src/
│   ├── app/                    # Next.js 14+ app router
│   │   ├── api/               # API routes (Phase 2)
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── charts/           # Chart components
│   │   ├── filters/          # Filter components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                  # Utility libraries
│   │   ├── utils.ts          # General utilities
│   │   ├── constants.ts      # App constants
│   │   ├── types.ts          # TypeScript definitions
│   │   ├── supabase.ts       # Supabase client (Phase 2)
│   │   └── mock-data.ts      # Mock data generator (Phase 1)
│   └── stores/               # Zustand stores
│       └── dashboard.ts      # Main dashboard store
├── public/                   # Static assets
├── docs/                     # Documentation
│   ├── prd.md               # Product requirements
│   └── architecture.md      # This document
└── package.json             # Dependencies
```

This architecture provides a solid foundation for both Phase 1 (frontend validation) and Phase 2 (backend integration) while maintaining performance, security, and scalability requirements.