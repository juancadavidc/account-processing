export const APP_NAME = 'Balances Dashboard';

export const CURRENCIES = {
  COP: 'COP',
} as const;

export const TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const;

export const TIME_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  AVERAGE: 'average',
} as const;

export const CHART_COLORS = {
  PRIMARY: 'hsl(var(--chart-1))',
  SECONDARY: 'hsl(var(--chart-2))',
  TERTIARY: 'hsl(var(--chart-3))',
  QUATERNARY: 'hsl(var(--chart-4))',
  QUINARY: 'hsl(var(--chart-5))',
} as const;