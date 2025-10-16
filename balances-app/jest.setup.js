// Jest setup file for additional configuration
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom');

// Mock environment variables for tests
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.WEBHOOK_SECRET = 'test-webhook-secret'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  // Keep error and warn for debugging test failures
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: console.error,
  warn: console.warn,
};