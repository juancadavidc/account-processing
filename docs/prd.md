# Product Requirements Document: Bancolombia Transfer Dashboard

## Overview
A React-based fullstack dashboard application to parse, analyze, and visualize Bancolombia bank transfer messages for business deposit tracking and analytics. SMS messages are received via **webhook integration** from third-party providers and processed in real-time.

## Objectives
- Parse incoming Bancolombia transfer SMS messages via webhook
- Provide real-time deposit analytics (daily, weekly, monthly) with 1-2 second update latency
- Display strategic metrics for business decision-making
- Offer intuitive UI for monitoring commercial transactions
- Ensure reliable message processing with minimal data loss

## Scope
- **In Scope**: Deposit transactions via webhook, real-time dashboard updates, message persistence
- **Out of Scope**: Withdrawals, balance inquiries, other banking operations

## Development Strategy
**Phase 1**: Frontend with mock data for product validation  
**Phase 2**: Backend webhook integration after UI/UX validation

## Target Users
- Business owners monitoring incoming payments
- Finance teams tracking commercial deposits
- Merchants analyzing payment patterns

## Functional Requirements

### 1. Webhook Integration System
**Phase 2**: Receive SMS messages via HTTP webhook from third-party providers and process them in real-time.

**Webhook Payload Expected:**
```json
{
  "message": "Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06",
  "timestamp": "2025-09-05T08:06:30Z",
  "phone": "+573001234567",
  "webhookId": "webhook_12345"
}
```

### 2. Message Parsing System
Parse Bancolombia SMS messages with the following structure:
```
Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06
```

**Extracted Data Fields:**
- **Amount**: $190,000 (numeric value for calculations)
- **Sender Name**: MARIA CUBAQUE  
- **Account**: **7251 (last 4 digits)
- **Date**: 04/09/2025
- **Time**: 08:06
- **Transaction Type**: Transferencia (Transfer)
- **Webhook ID**: Unique identifier for debugging and duplicate prevention

### 3. Dashboard Components

#### 3.1 Analytics Cards
- **Daily Deposits**: Total amount and count for current day
- **Weekly Deposits**: Total amount and count for current week  
- **Monthly Deposits**: Total amount and count for current month
- **Average Transaction**: Mean deposit amount
- **Real-time Updates**: Cards update automatically when new transactions arrive (1-2 second delay acceptable)

#### 3.2 Visualizations
- **Deposit Timeline**: Line chart showing deposits over time
- **Hourly Patterns**: Bar chart of deposit distribution by hour
- **Top Senders**: List of most frequent senders
- **Daily Comparison**: Current vs previous period metrics
- **Real-time Charts**: All visualizations update automatically with new data

#### 3.3 Transaction Table  
- Sortable/filterable table with all parsed transactions
- Columns: Date, Time, Amount, Sender, Account, Status
- Search functionality by sender name
- Date range filters
- **Live Updates**: New transactions appear at top of table automatically

### 4. Data Structure

#### Transaction Model
```typescript
interface Transaction {
  id: string;
  amount: number;
  currency: string;
  senderName: string;
  accountNumber: string;
  date: Date;
  time: string;
  rawMessage: string;
  parsedAt: Date;
  webhookId: string;  // 🚀 NEW: For debugging and duplicate detection
  status: 'processed' | 'failed' | 'duplicate';  // 🚀 NEW: Processing status
}
```

#### Analytics Model  
```typescript
interface DashboardMetrics {
  period: 'daily' | 'weekly' | 'monthly';  // 🚀 NEW: Period specification
  totalAmount: number;  // Renamed from dailyTotal, weeklyTotal, etc.
  transactionCount: number;  // Renamed from dailyCount, etc.
  averageAmount: number;  // Renamed from averageTransaction
  periodStart: Date;  // 🚀 NEW: Period boundaries
  periodEnd: Date;
  lastUpdated: Date;  // 🚀 NEW: Cache invalidation
}
```

#### Parse Error Model (Phase 2)
```typescript
interface ParseError {
  id: string;
  rawMessage: string;
  errorReason: string;
  webhookId: string;
  occurredAt: Date;
  resolved: boolean;
}
```

## Technical Requirements

### Platform Architecture (Phase 2)
- **Platform**: Vercel + Supabase
- **Deployment**: Vercel Edge Functions for webhook processing
- **Database**: PostgreSQL (Supabase) with real-time subscriptions
- **Real-time**: Supabase Realtime for live dashboard updates

### Frontend Stack
- **Framework**: Next.js 14+ with TypeScript
- **UI Library**: shadcn/ui components  
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **State Management**: Zustand
- **Real-time**: Supabase client with real-time subscriptions

### Backend Stack (Phase 2)
- **Runtime**: Next.js API Routes (Vercel Edge Functions)
- **Database**: PostgreSQL 15+ (Supabase)
- **Authentication**: Supabase Auth
- **Monitoring**: Vercel Analytics + Function Logs

### Core Components (shadcn/ui)
- `Card` - Metric display cards
- `Table` - Transaction listings
- `Button` - Action triggers
- `Input` - Search functionality
- `Select` - Filters and dropdowns
- `Badge` - Status indicators
- `Dialog` - Transaction details modal
- `Calendar` - Date range picker

### Data Processing  
- Regex patterns for message parsing
- Date/time standardization
- Currency formatting (Colombian Peso)
- Error handling for malformed messages
- **Webhook Processing**: Handle incoming HTTP requests (<100ms response)
- **Duplicate Detection**: Prevent processing duplicate webhook payloads

### Performance Requirements
- **Webhook Response**: <100ms response time to third-party provider
- **Dashboard Updates**: Real-time updates with 1-2 second acceptable latency
- Handle 1000+ transactions without performance degradation
- Responsive design (mobile-first)
- **Phase 1**: Mock data simulation for UI performance testing
- **Phase 2**: Database query optimization and caching

## User Interface Specifications

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│                   Header                        │
├─────────────────────────────────────────────────┤
│  [Daily] [Weekly] [Monthly] [Average] Cards     │
├─────────────────────────────────────────────────┤
│          Charts Section (2x2 Grid)             │
├─────────────────────────────────────────────────┤
│               Transaction Table                 │
│  [Search] [Filters] [Export]                   │
│  Date | Time | Amount | Sender | Account       │
└─────────────────────────────────────────────────┘
```

### Color Scheme
- **Primary**: Green (banking/money theme)
- **Success**: Emerald for positive metrics
- **Neutral**: Slate for text and borders
- **Background**: White/light gray

## Success Metrics

### Phase 1 Success Criteria (Frontend + Mocks)
- **UI Performance**: Dashboard loads in <2 seconds with mock data
- **User Engagement**: Positive feedback on layout and data presentation
- **Functionality**: All filters, search, sorting, and mock real-time updates work correctly
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Component Library**: All shadcn/ui components properly implemented

### Phase 2 Success Criteria (Backend Integration)
- **Parsing Accuracy**: >99% of valid Bancolombia messages parsed correctly
- **Webhook Reliability**: <1% message loss rate
- **Real-time Performance**: Dashboard updates within 1-2 seconds of webhook receipt
- **Data Integrity**: Zero transaction data loss
- **System Reliability**: 99.9% uptime for webhook endpoint

## Future Enhancements (Out of Current Scope)
- Multi-bank support (beyond Bancolombia)
- Export functionality (PDF, Excel)
- Alert system for large deposits
- Integration with accounting software
- Mobile app version
- Real-time notifications

## Acceptance Criteria

### Phase 1 (Frontend + Mocks)
1. Dashboard displays mock transaction data in all components
2. Analytics cards show daily/weekly/monthly metrics accurately
3. Transaction table supports search, filtering, and sorting
4. Charts display meaningful deposit patterns and trends  
5. Responsive design works flawlessly on desktop, tablet, and mobile
6. All shadcn/ui components properly styled with Tailwind CSS
7. Mock real-time updates simulate webhook behavior
8. Loading states and error handling implemented

### Phase 2 (Backend Integration)
1. Webhook endpoint successfully receives and processes SMS messages
2. Parse Bancolombia message format with >99% accuracy
3. Real-time dashboard updates within 1-2 seconds of webhook
4. Database persistence with zero data loss
5. Error handling and logging for failed parsing attempts
6. Duplicate message detection and handling
7. Authentication and webhook security implemented

## Risk Mitigation

### Phase 1 Risks
- **Mock Data Realism**: Use realistic Colombian names, amounts, and timestamps
- **Performance Testing**: Test with 1000+ mock transactions
- **User Feedback**: Validate UI/UX before backend investment
- **Browser Compatibility**: Test on Chrome, Firefox, Safari, Edge

### Phase 2 Risks  
- **Message Format Changes**: Implement flexible parsing with fallback patterns
- **Webhook Reliability**: Implement retry mechanisms and dead letter queues
- **Data Volume**: Implement pagination and database indexing
- **Security**: Webhook authentication and input validation
- **Data Privacy**: Ensure sensitive financial information is handled securely
- **Third-party Dependencies**: Plan for SMS provider API changes or outages

## Development Timeline

### Phase 1: Frontend + Mocks (2-3 weeks)
- Week 1: Project setup, shadcn/ui components, basic layout
- Week 2: Dashboard components, mock data integration, Zustand store
- Week 3: Charts, filtering, responsive design, user testing

### Phase 2: Backend Integration (2-3 weeks)
- Week 1: Database schema, Supabase setup, webhook endpoint
- Week 2: SMS parsing, real-time subscriptions, error handling  
- Week 3: Authentication, monitoring, production deployment