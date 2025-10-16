# Balances Dashboard - Claude Assistant Guide

## Project Overview
Modern React dashboard for banking transaction analysis with real-time SMS webhook processing. Built with Next.js 15, TypeScript, and Supabase.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: Supabase with PostgreSQL
- **API**: Next.js API Routes with Edge Functions
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Charts**: Recharts
- **State**: Zustand
- **Testing**: Jest + React Testing Library (46 test cases)
- **Real-time**: Supabase real-time subscriptions

## Development Commands
```bash
npm run dev          # Start development server (with Turbopack)
npm run build        # Build for production (with Turbopack)
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Jest test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Project Structure
```
src/
├── app/                 # Next.js app router pages
│   └── api/webhook/sms/ # SMS webhook endpoint (Edge Function)
├── components/
│   ├── charts/         # Chart components (Balance, Transaction, etc.)
│   ├── dashboard/      # Dashboard layout and components
│   ├── filters/        # Filter components
│   └── ui/            # Base UI components (shadcn/ui)
├── hooks/              # Custom React hooks
├── lib/                # Utilities, types, database, SMS parsing
│   ├── sms-parser.ts  # SMS message parsing with >99% accuracy
│   ├── database.ts    # Database operations and transformations
│   ├── realtime.ts    # Real-time subscription management
│   ├── types.ts       # TypeScript type definitions
│   ├── supabase.ts    # Supabase client configuration
│   └── __tests__/     # Unit tests for core functionality
└── stores/             # Zustand state stores
migrations/             # Database schema migrations
jest.config.js          # Jest testing configuration
```

## Key Features
- **SMS Webhook Processing**: Secure `/api/webhook/sms` endpoint with Bearer auth
- **Real-time Transaction Parsing**: >99% accuracy Bancolombia SMS parsing
- **Interactive Dashboard**: Charts, filtering, and real-time updates
- **Colombian Localization**: Peso formatting and date handling
- **Comprehensive Testing**: 46 test cases covering SMS parsing and webhook functionality
- **Database Integration**: PostgreSQL with real-time subscriptions
- **Type Safety**: Full TypeScript implementation

## Webhook Integration

### V1 Endpoint (Legacy)
```
POST /api/webhook/sms
Authorization: Bearer YOUR_WEBHOOK_SECRET
Content-Type: application/json
```

### V2 Endpoint (Recommended)
```
POST /api/v2/webhook/transaction
Authorization: Bearer YOUR_WEBHOOK_SECRET
Content-Type: application/json
```

#### V2 Features
- **Multi-user support** with source-based routing
- **Structured payloads** (no parsing required)
- **Multiple source types**: email, phone, webhook
- **Enhanced validation** with detailed error responses
- **Flexible metadata** support
- **Performance monitoring** and logging

### Environment Variables Required
```bash
# Client-side Supabase configuration (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server-side Supabase configuration (private)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Webhook authentication
WEBHOOK_SECRET=your_webhook_secret_token
```

### V1 SMS Message Format Supported
```
Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06
```

### V2 Structured Payload Format
```json
{
  "source": "bancolombia",
  "timestamp": "2025-09-04T08:06:00Z",
  "sourceFrom": "bancolombia@noreply.com",
  "sourceTo": "jdcadavid96@gmail.com",
  "event": "deposit",
  "message": "Bancolombia: Recibiste una transferencia por $190,000...",
  "amount": 190000,
  "currency": "COP",
  "webhookId": "webhook_1693814760_12345",
  "metadata": {
    "accountNumber": "7251",
    "senderName": "MARIA CUBAQUE"
  }
}
```

## Database Schema

### V1 Tables (Legacy)

#### Transactions Table
- `id` (UUID, Primary Key)
- `amount` (DECIMAL) - Transaction amount
- `currency` (VARCHAR) - "COP" for Colombian Peso
- `sender_name` (VARCHAR) - Parsed sender name
- `account_number` (VARCHAR) - Account last 4 digits
- `transaction_date` (DATE) - Transaction date
- `transaction_time` (TIME) - Transaction time
- `raw_message` (TEXT) - Original SMS message
- `webhook_id` (VARCHAR, UNIQUE) - Webhook identifier for duplicates
- `status` (VARCHAR) - Transaction status
- `created_at` (TIMESTAMP) - Record creation time

#### Parse Errors Table
- `id` (UUID, Primary Key)
- `raw_message` (TEXT) - Failed SMS message
- `error_reason` (TEXT) - Parsing failure reason
- `webhook_id` (VARCHAR) - Associated webhook ID
- `occurred_at` (TIMESTAMP) - Error occurrence time
- `resolved` (BOOLEAN) - Resolution status

### V2 Tables (Multi-user)

#### Sources Table
- `id` (UUID, Primary Key)
- `source_type` (VARCHAR) - "email", "phone", "webhook"
- `source_value` (VARCHAR, UNIQUE) - Email address, phone number, webhook URL
- `created_at` (TIMESTAMP) - Record creation time

#### User Sources Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK to auth.users) - User who owns this source
- `source_id` (UUID, FK to sources) - Reference to source
- `is_active` (BOOLEAN) - Whether source is active for user
- `created_at` (TIMESTAMP) - Record creation time

#### V2 Transactions Table
- `id` (UUID, Primary Key)
- `source_id` (UUID, FK to sources) - Reference to source that generated transaction
- `amount` (DECIMAL) - Transaction amount
- `currency` (VARCHAR) - Currency code
- `sender_name` (VARCHAR) - Sender name from metadata
- `account_number` (VARCHAR) - Account number from metadata
- `transaction_date` (DATE) - Transaction date
- `transaction_time` (TIME) - Transaction time
- `raw_message` (TEXT) - Original message
- `webhook_id` (VARCHAR, UNIQUE) - Webhook identifier
- `event` (VARCHAR) - "deposit", "withdrawal", "transfer"
- `status` (VARCHAR) - Transaction status
- `created_at` (TIMESTAMP) - Record creation time

## Testing

### Running Tests
```bash
npm test                    # Run all tests
npm test sms-parser        # Run SMS parser tests
npm test webhook           # Run webhook endpoint tests
npm run test:coverage      # Run with coverage report
```

### Test Coverage
- **SMS Parser**: 25 comprehensive test cases
- **Webhook Endpoint**: 21 integration test cases
- **Edge Cases**: Invalid dates, malformed messages, authentication
- **Performance**: Response time validation

## Supabase Commands
- `supabase login` - Login to Supabase account
- `supabase init` - Initialize Supabase project
- `supabase link --project-ref YOUR_PROJECT_ID` - Link to existing project
- `supabase start` - Start local Supabase stack (requires Docker)
- `supabase status` - Check running services
- `supabase stop` - Stop local services
- `supabase db reset` - Reset local database
- `supabase migration new MIGRATION_NAME` - Create new migration
- `supabase db push` - Push schema changes to remote
- `supabase functions new FUNCTION_NAME` - Create new Edge function
- `supabase functions serve` - Serve functions locally

## Important Files
- `src/app/api/webhook/sms/route.ts` - Main webhook endpoint implementation
- `src/lib/sms-parser.ts` - SMS message parsing logic
- `src/lib/database.ts` - Database operations and transformations
- `src/lib/realtime.ts` - Real-time subscription management
- `src/lib/types.ts` - TypeScript type definitions
- `src/lib/supabase.ts` - Supabase client configuration
- `migrations/` - Database schema migrations
- `jest.config.js` - Testing configuration
- `components.json` - shadcn/ui configuration