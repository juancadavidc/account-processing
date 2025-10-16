# Coding Standards

## Overview
This document outlines the coding standards and conventions for the Bancolombia Transfer Dashboard project. These standards ensure consistency, maintainability, and quality across the codebase.

## TypeScript Standards

### Interface Definitions
All data models must be strongly typed with TypeScript interfaces:

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

### Type Safety
- Use strict TypeScript configuration
- Avoid `any` types - prefer `unknown` when type is uncertain
- Use union types for status enums
- Implement proper error handling with typed error responses

## Component Standards

### React Component Structure
Follow consistent component patterns:

```typescript
interface ComponentProps {
  // Props interface always defined
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### shadcn/ui Integration
- Use shadcn/ui components as base building blocks
- Follow shadcn/ui naming conventions
- Extend components through composition, not modification
- Maintain consistent spacing with Tailwind utilities

### Component Organization
```
src/components/
├── dashboard/          # Dashboard-specific components
├── charts/            # Chart components (Recharts)
├── filters/           # Filter and search components
└── ui/                # shadcn/ui base components
```

## State Management Standards

### Zustand Store Pattern
```typescript
interface StoreState {
  // State properties
  data: DataType[];
  loading: boolean;
  error: string | null;
  
  // Actions
  addItem: (item: DataType) => void;
  updateItem: (id: string, updates: Partial<DataType>) => void;
  clearError: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  data: [],
  loading: false,
  error: null,
  
  // Actions implementation
  addItem: (item) => set((state) => ({
    data: [...state.data, item]
  })),
  
  clearError: () => set({ error: null })
}));
```

## Styling Standards

### Tailwind CSS Conventions
- Use utility-first approach
- Group utilities logically: layout, spacing, typography, colors
- Use CSS variables for theme consistency
- Maintain responsive design patterns

### Component Styling Example
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <Card className="p-6 border-border bg-card">
    <CardContent className="space-y-2">
      {/* Content */}
    </CardContent>
  </Card>
</div>
```

## Data Processing Standards

### SMS Parsing Pattern
```typescript
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

### Error Handling
- Always implement proper error boundaries
- Use typed error responses
- Log errors with context for debugging
- Provide user-friendly error messages

## API Standards

### Endpoint Naming
- Use RESTful conventions
- Include version in URL if needed
- Use descriptive resource names

```typescript
// Good
GET /api/transactions?search=&dateFrom=&dateTo=&status=&page=1&limit=50
GET /api/metrics?period=daily|weekly|monthly
POST /api/webhook/sms

// Avoid
GET /api/getTrans
POST /api/webhook
```

### Response Format
```typescript
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  timestamp: string;
}
```

## Security Standards

### Input Validation
- Validate all webhook inputs
- Sanitize user search inputs
- Use TypeScript for compile-time validation
- Implement runtime validation for external data

### Authentication
```typescript
// Webhook authentication
const validateWebhookAuth = (authorization: string): boolean => {
  return authorization === `Bearer ${process.env.WEBHOOK_SECRET}`;
};
```

### Data Privacy
- Hash sensitive information when required
- Implement proper access controls
- Use environment variables for secrets
- Follow principle of least privilege

## Performance Standards

### Response Time Requirements
- Webhook processing: < 100ms
- Dashboard load: < 2 seconds
- Real-time updates: 1-2 second latency
- Search/filter operations: < 500ms

### Optimization Techniques
- Implement proper pagination (50 items per page)
- Use React.memo for expensive components
- Optimize database queries with proper indexing
- Cache metrics with appropriate TTL

## Testing Standards

### Unit Testing
```typescript
// Component testing
import { render, screen } from '@testing-library/react';
import { MetricsCard } from './MetricsCard';

test('displays transaction metrics correctly', () => {
  render(<MetricsCard amount={190000} count={5} />);
  expect(screen.getByText('$190,000')).toBeInTheDocument();
});
```

### Testing Requirements
- Test all parsing logic with various SMS formats
- Validate data transformations
- Test state management actions
- Cover error scenarios and edge cases

## File Naming Conventions

### Component Files
- PascalCase for component files: `TransactionTable.tsx`
- kebab-case for utility files: `date-utils.ts`
- camelCase for store files: `dashboardStore.ts`

### Directory Structure
- Organize by feature/domain
- Keep related files close together
- Use index files for clean imports

## Git Commit Standards

### Commit Message Format
```
type(scope): description

feat(dashboard): add real-time transaction updates
fix(parsing): handle edge case in SMS parsing
docs(architecture): update coding standards
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Code Review Standards

### Review Checklist
- [ ] TypeScript types are properly defined
- [ ] Components follow established patterns
- [ ] Error handling is implemented
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Tests cover new functionality
- [ ] Documentation updated if needed

### Best Practices
- Keep pull requests focused and small
- Provide clear descriptions of changes
- Include screenshots for UI changes
- Test thoroughly before requesting review
- Address feedback promptly and professionally