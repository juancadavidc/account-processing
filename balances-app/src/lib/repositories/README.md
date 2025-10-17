# Repository Pattern Implementation

This directory contains the repository pattern implementation for the BMAD bank deposits application. The repository pattern provides a clean separation between the data access logic and the business logic, making the code more maintainable, testable, and following clean code principles.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Route Layer   │───▶│  Service Layer   │───▶│ Repository Layer│
│  (API Routes)   │    │ (WebhookService) │    │ (Data Access)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Repository Interfaces

### IWebhookRepository
Handles webhook processing operations for both V1 (SMS) and V2 (structured) webhooks.

**Key Methods:**
- `processSMSWebhook(webhookData: WebhookRequest)` - Process V1 SMS webhooks
- `processV2Webhook(webhookData: V2WebhookRequest)` - Process V2 structured webhooks
- `logParseError(data)` - Log parsing errors

### ITransactionRepository
Manages transaction data operations including CRUD operations and analytics.

**Key Methods:**
- `createTransaction(data)` - Create new transaction
- `createV2Transaction(sourceId, webhookData)` - Create V2 transaction
- `getTransactionByWebhookId(webhookId)` - Find transaction by webhook ID
- `getTransactions(filters)` - Get transactions with filtering
- `getTransactionMetrics(filters)` - Get transaction analytics
- `getDetailedMetrics(period, referenceDate)` - Get period-based metrics

### ISourceRepository
Manages source (email, phone, webhook) operations and user-source associations.

**Key Methods:**
- `findOrCreateSource(sourceType, sourceValue)` - Find or create source
- `getSourceById(sourceId)` - Get source by ID
- `getSourcesForUser(userId)` - Get user's sources
- `getUsersForSource(sourceId)` - Get users for a source
- `addUserSource(userId, sourceId)` - Associate user with source
- `removeUserSource(userId, sourceId)` - Remove user-source association

### IParseErrorRepository
Handles parse error logging and management.

**Key Methods:**
- `createParseError(data)` - Log parse error
- `getParseErrors(filters)` - Get parse errors with filtering
- `resolveParseError(id)` - Mark error as resolved

## Service Layer

### WebhookService
Orchestrates webhook processing and provides validation, security, and rate limiting.

**Key Methods:**
- `processWebhook(webhookData, version)` - Process webhook (V1 or V2)
- `validateWebhookRequest(request)` - Validate incoming webhook request
- `checkRateLimit(clientIP)` - Check rate limiting
- `validateTimestamp(timestamp, maxAgeMinutes)` - Validate request timestamp
- `validateAuthToken(token)` - Validate authentication token

## Repository Factory

The `RepositoryFactory` provides a centralized way to create and manage repository instances with dependency injection.

**Key Methods:**
- `getWebhookRepository()` - Get webhook repository instance
- `getTransactionRepository()` - Get transaction repository instance
- `getSourceRepository()` - Get source repository instance
- `getParseErrorRepository()` - Get parse error repository instance
- `getWebhookService()` - Get webhook service instance
- `reset()` - Reset all repositories (useful for testing)

## Usage Example

```typescript
// In a route handler
import { RepositoryFactory } from '@/lib/repositories';

export async function POST(request: NextRequest) {
  // Get services from factory
  const webhookService = RepositoryFactory.getWebhookService();
  
  // Validate request
  const validation = await webhookService.validateWebhookRequest(request);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  
  // Process webhook
  const result = await webhookService.processWebhook(validation.webhookData!, 'v2');
  
  // Handle result
  if (result.success) {
    return NextResponse.json({ 
      status: 'processed', 
      transactionId: result.transactionId 
    });
  } else {
    return NextResponse.json({ 
      status: 'error', 
      error: result.error 
    }, { status: 400 });
  }
}
```

## Benefits

1. **Separation of Concerns**: Data access logic is separated from business logic
2. **Testability**: Each repository can be easily mocked for unit testing
3. **Maintainability**: Changes to data access don't affect business logic
4. **Reusability**: Repositories can be reused across different services
5. **Clean Code**: Follows SOLID principles and clean architecture patterns
6. **Dependency Injection**: Easy to swap implementations for different environments

## File Structure

```
src/lib/repositories/
├── interfaces.ts              # Repository and service interfaces
├── webhook-repository.ts      # Webhook repository implementation
├── transaction-repository.ts  # Transaction repository implementation
├── source-repository.ts       # Source repository implementation
├── parse-error-repository.ts  # Parse error repository implementation
├── index.ts                   # Exports and factory
└── README.md                  # This documentation

src/lib/services/
└── webhook-service.ts         # Webhook service implementation
```

## Migration from Direct Database Access

The original route handlers directly accessed the database and contained all the business logic. With the repository pattern:

1. **Before**: Route → Direct DB calls → Response
2. **After**: Route → Service → Repository → Database → Response

This provides better separation, testability, and maintainability while keeping the same functionality.

