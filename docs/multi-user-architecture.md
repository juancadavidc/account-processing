# Multi-User Architecture Design

## Overview
Design for a multi-tenant banking transaction system where users can configure multiple transaction sources (phones, emails) and share sources between users.

## Requirements
- **No sharing functionality** between users for transactions
- **Simple access control**: user has access or doesn't
- **Multiple sources per user**: Users can receive transactions from different email/phone sources
- **Shared sources**: One phone number can belong to multiple users (e.g., family accounts)
- **Source-based routing**: Transactions routed to users based on configured sources

## Database Schema

### Core Tables

```sql
-- Users table (managed by Supabase Auth)
users (
  id uuid primary key,
  email text,
  created_at timestamp
)

-- Transaction sources (shared between users)
sources (
  id uuid primary key,
  source_type text, -- 'phone', 'email', 'webhook'
  source_value text unique, -- '+573001234567', 'alerts@bancolombia.com'
  created_at timestamp
)

-- Many-to-many: users can have multiple sources, sources can belong to multiple users
user_sources (
  id uuid primary key,
  user_id uuid references users(id),
  source_id uuid references sources(id),
  is_active boolean default true,
  created_at timestamp,
  unique(user_id, source_id)
)

-- All transactions linked to sources
transactions (
  id uuid primary key,
  source_id uuid references sources(id),
  amount decimal,
  description text,
  account_number text, -- e.g., **7251
  sender_name text,
  transaction_date timestamp,
  webhook_id text unique, -- for duplicate detection
  raw_message text, -- original SMS/email content
  created_at timestamp
)
```

## Security - Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see sources they have configured
CREATE POLICY "Users see their configured sources" 
ON sources FOR SELECT 
USING (
  id IN (
    SELECT source_id FROM user_sources 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Users can only manage their own source configurations
CREATE POLICY "Users manage their own source configs" 
ON user_sources FOR ALL 
USING (user_id = auth.uid());

-- Users see transactions from their configured sources only
CREATE POLICY "Users see transactions from their sources" 
ON transactions FOR SELECT 
USING (
  source_id IN (
    SELECT source_id FROM user_sources 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

## API Flow

### 1. User Registration & Source Configuration
```
User signs up → Supabase Auth creates user → User configures sources in UI
```

### 2. Webhook Transaction Processing
```
SMS/Email arrives → Extract source info → Look up source_id → Create transaction
```

### 3. User Transaction Access
```
User requests transactions → RLS filters by user's sources → Return filtered results
```

## UI Components

### Sources Management Page
```
┌─────────────────────────────────────────┐
│ My Transaction Sources                   │
├─────────────────────────────────────────┤
│                                         │
│ Phone Numbers:                          │
│ ┌─────────────────┬─────────┬─────────┐ │
│ │ +573001234567   │ Active  │ Remove  │ │
│ │ +573009876543   │ Active  │ Remove  │ │
│ └─────────────────┴─────────┴─────────┘ │
│                                         │
│ Email Sources:                          │
│ ┌─────────────────────────┬─────────┬───┐ │
│ │ alerts@bancolombia.com  │ Active  │ X │ │
│ │ notify@nequi.com        │ Active  │ X │ │
│ └─────────────────────────┴─────────┴───┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Add New Source                      │ │
│ │ Type: [Phone ▼] [Email ▼]           │ │
│ │ Value: [                          ] │ │
│ │ [Add Source]                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Steps

1. **Create Supabase tables** with the schema above
2. **Set up RLS policies** for data isolation
3. **Update webhook endpoint** to use source-based routing
4. **Build sources management UI** for user configuration
5. **Update transaction queries** to respect user access

## Example Webhook Update

Current webhook logic:
```javascript
// Before: Direct user mapping
const user = await getUserByPhone(phone);
await createTransaction({ userId: user.id, ...data });
```

New webhook logic:
```javascript
// After: Source-based mapping
const source = await getSourceByValue(phone);
if (source) {
  await createTransaction({ sourceId: source.id, ...data });
}
```

## Benefits

- **Scalable**: Easy to add new source types (webhooks, APIs, etc.)
- **Flexible**: Users can configure multiple sources independently
- **Secure**: RLS ensures data isolation between users
- **Shared sources**: Family members can share phone numbers naturally
- **Simple**: No complex sharing permissions to manage

## V2 API Implementation Status ✅

### Completed Components

#### 1. Database Schema (`migrations/004_v2_schema_sources.sql`)
- ✅ `sources` table with source types and values
- ✅ `user_sources` many-to-many relationship table
- ✅ `v2_transactions` table with source-based routing
- ✅ Row Level Security (RLS) policies for multi-user isolation
- ✅ Performance indexes and constraints

#### 2. Type System (`src/lib/types.ts`)
- ✅ `V2WebhookRequest` interface for structured payloads
- ✅ `V2WebhookResponse` interface for consistent responses
- ✅ Source management types (`Source`, `UserSource`)
- ✅ Updated transaction types with source references

#### 3. Validation Layer (`src/lib/v2-validation.ts`)
- ✅ Zod schemas for request validation
- ✅ Email, phone, and webhook source validation
- ✅ Amount, timestamp, and event validation
- ✅ Flexible metadata support with type safety

#### 4. Database Layer (`src/lib/v2-database.ts`)
- ✅ `V2DatabaseService` class with full CRUD operations
- ✅ Source creation and lookup with automatic type detection
- ✅ User-source association management
- ✅ Transaction creation with duplicate detection
- ✅ Comprehensive error handling and data transformation

#### 5. API Endpoint (`src/app/api/v2/webhook/transaction/route.ts`)
- ✅ Structured webhook processor with enhanced security
- ✅ Source-based routing to appropriate users
- ✅ Comprehensive validation and error responses
- ✅ Performance monitoring and logging
- ✅ Health check endpoint

#### 6. Test Suite
- ✅ 25+ unit tests for validation layer (`src/lib/__tests__/v2-validation.test.ts`)
- ✅ 20+ unit tests for database service (`src/lib/__tests__/v2-database.test.ts`)
- ✅ 15+ integration tests for API endpoint (`src/app/api/v2/webhook/transaction/__tests__/route.test.ts`)
- ✅ V2 test script (`test-webhook-v2.sh`) with comprehensive scenarios

#### 7. Migration Tools
- ✅ Forward migration with schema creation
- ✅ Rollback migration for safe deployment
- ✅ Database comments and documentation

## API Comparison: V1 vs V2

### V1 Endpoint (Legacy)
```
POST /api/webhook/sms
```

**Payload:**
```json
{
  "message": "Bancolombia: Recibiste una transferencia por $190,000...",
  "timestamp": "2025-09-04T08:06:00Z",
  "phone": "+573001234567",
  "webhookId": "webhook_1693814760_12345"
}
```

**Issues:**
- Single global transaction table
- No user association
- Requires SMS parsing
- Limited to one source type

### V2 Endpoint (New)
```
POST /api/v2/webhook/transaction
```

**Payload:**
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

**Improvements:**
- ✅ Multi-user support with source routing
- ✅ Pre-parsed structured data
- ✅ Support for multiple source types (email, phone, webhook)
- ✅ Enhanced validation and error handling
- ✅ Flexible metadata system
- ✅ Performance monitoring

## Testing the V2 API

### Run V2 Test Suite
```bash
# Run all V2 tests
./test-webhook-v2.sh

# Run specific test categories
./test-webhook-v2.sh --valid     # Valid transactions only
./test-webhook-v2.sh --invalid   # Invalid transactions only
./test-webhook-v2.sh --auth      # Authentication tests
./test-webhook-v2.sh --duplicate # Duplicate detection
./test-webhook-v2.sh --health    # Health check
```

### Run Unit Tests
```bash
cd balances-app
npm test v2-validation      # Validation layer tests
npm test v2-database        # Database service tests
npm test route.test.ts      # API endpoint tests
```

## Migration Path

### For New Implementations
- Use V2 endpoint exclusively
- Configure sources via user management interface
- Leverage structured payload format

### For Existing V1 Users
1. **Phase 1**: Keep V1 running for backward compatibility
2. **Phase 2**: Migrate webhook senders to V2 format
3. **Phase 3**: Migrate existing transactions (optional)
4. **Phase 4**: Deprecate V1 endpoint

### Environment Variables
```bash
# Required for both V1 and V2
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
WEBHOOK_SECRET=your_webhook_secret_token

# Client-side (for UI)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps

### Phase 4: User Management UI (Planned)
- [ ] Source configuration interface
- [ ] User authentication integration
- [ ] Source sharing management
- [ ] Transaction filtering by source

### Phase 5: Advanced Features (Future)
- [ ] Webhook retry mechanisms
- [ ] Source health monitoring
- [ ] Analytics by source type
- [ ] Batch transaction processing