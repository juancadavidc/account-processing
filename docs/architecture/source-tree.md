# Source Tree Structure

## Overview
This document outlines the complete file and directory structure for the Bancolombia Transfer Dashboard project. The organization follows Next.js 14+ App Router conventions while maintaining clear separation of concerns.

## Root Directory Structure

```
bancolombia-balances/
├── README.md                  # Project overview and setup instructions
├── package.json              # Dependencies and scripts
├── package-lock.json         # Dependency lock file
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── .eslintrc.json            # ESLint configuration
├── .gitignore                # Git ignore patterns
├── .env.local                # Environment variables (local)
├── .env.example              # Environment variables template
├── vercel.json               # Vercel deployment configuration
├── src/                      # Source code directory
├── public/                   # Static assets
├── docs/                     # Documentation
├── tests/                    # Test files
└── .next/                    # Next.js build output (auto-generated)
```

## Source Directory (`src/`)

### App Router Structure (`src/app/`)
```
src/app/
├── layout.tsx                # Root layout component
├── page.tsx                  # Home page (redirects to dashboard)
├── globals.css               # Global CSS styles
├── loading.tsx               # Global loading UI
├── error.tsx                 # Global error boundary
├── not-found.tsx             # 404 page
├── dashboard/                # Dashboard feature pages
│   ├── page.tsx             # Main dashboard page
│   ├── layout.tsx           # Dashboard layout
│   └── loading.tsx          # Dashboard loading state
└── api/                     # API routes (Phase 2)
    ├── webhook/
    │   └── sms/
    │       └── route.ts     # Webhook endpoint for SMS processing
    ├── transactions/
    │   └── route.ts         # Transaction CRUD operations
    ├── metrics/
    │   └── route.ts         # Dashboard metrics endpoint
    └── health/
        └── route.ts         # Health check endpoint
```

### Components Directory (`src/components/`)
```
src/components/
├── dashboard/               # Dashboard-specific components
│   ├── MetricsCards.tsx    # Daily/weekly/monthly metric cards
│   ├── TransactionTable.tsx # Main transaction data table
│   ├── ChartsGrid.tsx      # Container for chart components
│   ├── RealTimeIndicator.tsx # Live update status indicator
│   ├── ExportButton.tsx    # Data export functionality
│   └── RefreshButton.tsx   # Manual refresh trigger
├── charts/                 # Data visualization components
│   ├── DepositTimeline.tsx # Line chart for deposits over time
│   ├── HourlyPatterns.tsx  # Bar chart showing hourly patterns
│   ├── TopSenders.tsx      # Top senders frequency chart
│   ├── DailyComparison.tsx # Period-over-period comparison
│   ├── AmountDistribution.tsx # Amount range distribution
│   └── ChartContainer.tsx  # Shared chart wrapper
├── filters/                # Search and filter components
│   ├── SearchBar.tsx       # Sender name search input
│   ├── DateRangePicker.tsx # Date range selection
│   ├── StatusFilter.tsx    # Transaction status filter
│   ├── AmountRangeFilter.tsx # Amount range filter
│   └── FilterBar.tsx       # Combined filter container
├── layout/                 # Layout and navigation components
│   ├── Header.tsx          # Main application header
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── Footer.tsx          # Application footer
│   └── Navigation.tsx      # Main navigation component
├── shared/                 # Reusable shared components
│   ├── LoadingSpinner.tsx  # Loading indicator
│   ├── ErrorBoundary.tsx   # Error handling wrapper
│   ├── EmptyState.tsx      # Empty data state
│   ├── DataTable.tsx       # Generic data table
│   └── Modal.tsx           # Generic modal wrapper
└── ui/                     # shadcn/ui base components
    ├── button.tsx          # Button component
    ├── card.tsx            # Card component
    ├── table.tsx           # Table components
    ├── input.tsx           # Input component
    ├── select.tsx          # Select dropdown
    ├── dialog.tsx          # Dialog/modal
    ├── calendar.tsx        # Calendar picker
    ├── badge.tsx           # Badge/tag component
    ├── alert.tsx           # Alert notifications
    └── toast.tsx           # Toast notifications
```

### Library Directory (`src/lib/`)
```
src/lib/
├── utils.ts                # General utility functions
├── constants.ts            # Application constants
├── types.ts                # TypeScript type definitions
├── validation.ts           # Input validation schemas
├── formatting.ts           # Data formatting utilities
├── date-utils.ts           # Date manipulation helpers
├── currency-utils.ts       # Currency formatting utilities
├── mock-data.ts            # Mock data generator (Phase 1)
├── sms-parser.ts           # SMS message parsing logic
├── supabase.ts             # Supabase client configuration (Phase 2)
├── database.ts             # Database query helpers (Phase 2)
└── api-client.ts           # API client configuration
```

### Stores Directory (`src/stores/`)
```
src/stores/
├── dashboard.ts            # Main dashboard state management
├── transactions.ts         # Transaction data store
├── filters.ts              # Filter state management
├── ui.ts                   # UI state (modals, loading, etc.)
└── index.ts                # Store exports
```

### Hooks Directory (`src/hooks/`)
```
src/hooks/
├── useTransactions.ts      # Transaction data hooks
├── useMetrics.ts           # Dashboard metrics hooks
├── useFilters.ts           # Filter management hooks
├── useRealtime.ts          # Real-time subscription hooks (Phase 2)
├── usePagination.ts        # Pagination logic
├── useDebounce.ts          # Debounce utility hook
└── useLocalStorage.ts      # Local storage persistence
```

## Public Directory (`public/`)
```
public/
├── favicon.ico             # Website favicon
├── logo.svg                # Application logo
├── icons/                  # UI icons and graphics
│   ├── bank.svg           # Banking related icons
│   ├── chart.svg          # Chart icons
│   └── filter.svg         # Filter icons
├── images/                 # Static images
│   ├── empty-state.svg    # Empty state illustrations
│   └── error-state.svg    # Error state illustrations
└── manifest.json          # PWA manifest file
```

## Documentation Directory (`docs/`)
```
docs/
├── README.md               # Documentation index
├── architecture.md         # Main architecture document
├── architecture/           # Architecture subdirectories
│   ├── coding-standards.md # Coding standards and conventions
│   ├── tech-stack.md       # Technology stack details
│   └── source-tree.md      # This file
├── prd.md                  # Product Requirements Document
├── deployment.md           # Deployment instructions
├── api.md                  # API documentation (Phase 2)
├── database.md             # Database schema and migrations
├── testing.md              # Testing strategy and guidelines
└── stories/                # User stories and requirements
    ├── 1.1.story.md       # Core dashboard functionality
    ├── 1.2.story.md       # Real-time updates
    ├── 2.1.story.md       # Filtering and search
    ├── 2.2.story.md       # Data visualization
    ├── 2.3.story.md       # Export functionality
    └── 2.4.story.md        # Performance optimization
```

## Test Directory (`tests/`)
```
tests/
├── __mocks__/              # Mock files for testing
│   ├── supabase.ts        # Supabase client mock
│   └── api-responses.ts   # Mock API responses
├── unit/                   # Unit tests
│   ├── components/        # Component tests
│   ├── hooks/             # Hook tests
│   ├── lib/               # Utility function tests
│   └── stores/            # Store tests
├── integration/            # Integration tests
│   ├── api/               # API endpoint tests
│   ├── database/          # Database operation tests
│   └── webhook/           # Webhook processing tests
├── e2e/                    # End-to-end tests
│   ├── dashboard.spec.ts  # Dashboard functionality
│   ├── filters.spec.ts    # Filter operations
│   └── real-time.spec.ts  # Real-time updates
├── fixtures/               # Test data fixtures
│   ├── transactions.json  # Sample transaction data
│   ├── sms-messages.json  # Sample SMS messages
│   └── metrics.json       # Sample metrics data
└── setup.ts               # Test environment setup
```

## Configuration Files

### TypeScript Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/stores/*": ["./src/stores/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Next.js Configuration (`next.config.js`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    CUSTOM_KEY: 'value',
  },
}

module.exports = nextConfig
```

### Tailwind Configuration (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // ... more theme colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## File Naming Conventions

### Component Files
- **React Components**: PascalCase (`TransactionTable.tsx`)
- **Pages**: lowercase (`page.tsx`, `layout.tsx`)
- **API Routes**: lowercase (`route.ts`)

### Utility Files
- **Utilities**: kebab-case (`date-utils.ts`)
- **Constants**: kebab-case (`api-constants.ts`)
- **Types**: kebab-case (`transaction-types.ts`)

### Test Files
- **Unit Tests**: `ComponentName.test.tsx`
- **Integration Tests**: `feature-name.integration.test.ts`
- **E2E Tests**: `feature-name.spec.ts`

## Import Path Organization

### Import Order
1. React and Next.js imports
2. Third-party library imports
3. Internal imports (absolute paths)
4. Relative imports

### Example Import Structure
```typescript
import React from 'react';
import { NextPage } from 'next';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useTransactions } from '@/hooks/useTransactions';
import { Transaction } from '@/lib/types';

import { MetricsCard } from './MetricsCard';
```

## Build Output Structure (`.next/`)
```
.next/
├── cache/                  # Build cache
├── static/                 # Static assets
│   ├── chunks/            # JavaScript chunks
│   ├── css/               # Compiled CSS
│   └── media/             # Optimized images
├── server/                 # Server-side code
│   ├── app/               # App router pages
│   └── api/               # API routes
└── types/                  # Generated TypeScript types
```

## Environment Files
```
.env.local                  # Local development variables
.env.development           # Development environment
.env.staging               # Staging environment
.env.production            # Production environment
.env.example               # Template for environment variables
```

This source tree structure provides clear organization, scalability, and maintainability while following Next.js 14+ best practices and modern React development patterns.