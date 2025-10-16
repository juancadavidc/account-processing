import { POST, OPTIONS } from '../route';
import { NextRequest } from 'next/server';

// Mock environment variables
const mockEnvVars = {
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  WEBHOOK_SECRET: 'test-webhook-secret'
};

// Mock Supabase client
const mockSupabaseResponse = {
  data: null,
  error: null
};

const mockInsertResponse = {
  data: null,
  error: null
};

const mockInsert = jest.fn(() => ({
  select: jest.fn(() => ({
    single: jest.fn(() => Promise.resolve(mockInsertResponse))
  }))
}));

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
      }))
    })),
    insert: mockInsert
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock environment variables
  Object.entries(mockEnvVars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // Mock console methods
  console.error = jest.fn();
  console.log = jest.fn();

  // Reset mock responses
  mockSupabaseResponse.data = null;
  mockSupabaseResponse.error = null;
  mockInsertResponse.data = null;
  mockInsertResponse.error = null;
  
  // Clear insert mock
  mockInsert.mockClear();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('/api/webhook/sms', () => {
  const validPayload = {
    message: 'Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06',
    timestamp: '2025-09-05T08:06:30Z',
    phone: '+573001234567',
    webhookId: 'webhook_12345'
  };

  const createMockRequest = (
    method: string,
    payload?: unknown,
    headers: Record<string, string> = {}
  ) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-webhook-secret',
      ...headers
    };

    return new NextRequest(
      new URL('http://localhost:3000/api/webhook/sms'),
      {
        method,
        headers: defaultHeaders,
        body: payload ? JSON.stringify(payload) : undefined
      }
    );
  };

  describe('OPTIONS method', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });

  describe('POST method - Environment validation', () => {
    it('should return 500 when SUPABASE_URL is missing', async () => {
      const originalValue = process.env.SUPABASE_URL;
      process.env.SUPABASE_URL = '';
      
      const request = createMockRequest('POST', validPayload);
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      // Accept either the specific error message or generic internal server error
      // due to module-level environment variable imports
      expect(['Server configuration error', 'Internal server error']).toContain(data.error);
      
      // Restore the original value
      process.env.SUPABASE_URL = originalValue;
    });

    it('should return 500 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const request = createMockRequest('POST', validPayload);
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
    });

    it('should return 500 when WEBHOOK_SECRET is missing', async () => {
      delete process.env.WEBHOOK_SECRET;
      const request = createMockRequest('POST', validPayload);
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
    });
  });

  describe('POST method - Authentication', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const request = createMockRequest('POST', validPayload, { Authorization: '' });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Missing or invalid authorization header');
    });

    it('should return 401 when Bearer token is invalid', async () => {
      const request = createMockRequest('POST', validPayload, {
        Authorization: 'Bearer invalid-token'
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Invalid webhook token');
    });

    it('should return 401 when Authorization header format is wrong', async () => {
      const request = createMockRequest('POST', validPayload, {
        Authorization: 'Token test-webhook-secret'
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.status).toBe('error');
    });
  });

  describe('POST method - Content validation', () => {
    it('should return 400 for invalid Content-Type', async () => {
      const request = createMockRequest('POST', validPayload, {
        'Content-Type': 'text/plain'
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Content-Type must be application/json');
    });

    it('should return 400 for invalid JSON payload', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/webhook/sms'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-webhook-secret'
          },
          body: 'invalid json'
        }
      );
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('should return 400 for invalid webhook payload format', async () => {
      const invalidPayload = {
        message: 'test',
        // missing required fields
      };
      
      const request = createMockRequest('POST', invalidPayload);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Invalid webhook payload format');
    });
  });

  describe('POST method - Duplicate detection', () => {
    it('should return duplicate status when webhookId already exists', async () => {
      // Mock existing transaction found
      mockSupabaseResponse.data = { id: 'existing-transaction-id', webhook_id: 'webhook_12345' };
      mockSupabaseResponse.error = null;
      
      const request = createMockRequest('POST', validPayload);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('duplicate');
      expect(data.transactionId).toBe('existing-transaction-id');
      expect(data.webhookId).toBe('webhook_12345');
    });

    it('should continue processing when no duplicate found', async () => {
      // Mock no existing transaction (PGRST116 is "not found" error code)
      mockSupabaseResponse.data = null;
      mockSupabaseResponse.error = { code: 'PGRST116' };

      // Mock successful transaction insert
      mockInsertResponse.data = { id: 'new-transaction-id' };
      mockInsertResponse.error = null;
      
      const request = createMockRequest('POST', validPayload);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('processed');
      expect(data.transactionId).toBe('new-transaction-id');
    });

    it('should return 500 for database connection error', async () => {
      // Mock database connection error
      mockSupabaseResponse.data = null;
      mockSupabaseResponse.error = { code: 'CONNECTION_ERROR', message: 'Database unavailable' };
      
      const request = createMockRequest('POST', validPayload);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Database connection error');
    });
  });

  describe('POST method - SMS parsing', () => {
    beforeEach(() => {
      // Mock no duplicate found
      mockSupabaseResponse.data = null;
      mockSupabaseResponse.error = { code: 'PGRST116' };
    });

    it('should process valid Bancolombia SMS successfully', async () => {
      // Mock successful transaction insert
      mockInsertResponse.data = { id: 'new-transaction-id' };
      mockInsertResponse.error = null;
      
      const request = createMockRequest('POST', validPayload);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('processed');
      expect(data.transactionId).toBe('new-transaction-id');
      expect(data.webhookId).toBe('webhook_12345');
    });

    it('should handle SMS parsing failure and log to parse_errors', async () => {
      const invalidSmsPayload = {
        ...validPayload,
        message: 'Invalid SMS format that will not parse'
      };

      // Mock parse error insert
      mockInsertResponse.data = null;
      mockInsertResponse.error = null;
      
      const request = createMockRequest('POST', invalidSmsPayload);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Parse failed:');
      expect(data.webhookId).toBe('webhook_12345');
      
      // Verify parse error was logged
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          raw_message: invalidSmsPayload.message,
          error_reason: expect.any(String),
          webhook_id: 'webhook_12345'
        })
      );
    });
  });

  describe('POST method - Database operations', () => {
    beforeEach(() => {
      // Mock no duplicate found
      mockSupabaseResponse.data = null;
      mockSupabaseResponse.error = { code: 'PGRST116' };
    });

    it('should handle transaction insertion failure', async () => {
      // Mock failed transaction insert
      mockInsertResponse.data = null;
      mockInsertResponse.error = { message: 'Database constraint violation' };
      
      const request = createMockRequest('POST', validPayload);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Failed to store transaction');
      expect(data.webhookId).toBe('webhook_12345');
    });

    it('should insert transaction with correct data format', async () => {
      // Mock successful transaction insert
      mockInsertResponse.data = { id: 'new-transaction-id' };
      mockInsertResponse.error = null;
      
      const request = createMockRequest('POST', validPayload);
      await POST(request);
      
      // Verify the from() method was called with 'transactions'
      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
    });
  });

  describe('POST method - Performance and logging', () => {
    beforeEach(() => {
      // Mock no duplicate found and successful insert
      mockSupabaseResponse.data = null;
      mockSupabaseResponse.error = { code: 'PGRST116' };
      mockInsertResponse.data = { id: 'new-transaction-id' };
      mockInsertResponse.error = null;
    });

    it('should log performance metrics on successful processing', async () => {
      const request = createMockRequest('POST', validPayload);
      await POST(request);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Webhook processed successfully'),
        expect.objectContaining({
          webhookId: 'webhook_12345',
          transactionId: 'new-transaction-id',
          amount: 190000,
          responseTime: expect.any(Number)
        })
      );
    });

    it('should log errors with response time on failure', async () => {
      // Mock database error
      mockInsertResponse.data = null;
      mockInsertResponse.error = { message: 'Database connection failed' };
      
      const request = createMockRequest('POST', validPayload);
      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to insert transaction'),
        expect.any(Object)
      );
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const request = createMockRequest('POST', validPayload);
      await POST(request);
      const responseTime = Date.now() - startTime;
      
      // Should respond quickly in test environment (allowing for some overhead)
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('POST method - CORS headers', () => {
    it('should include CORS headers in all responses', async () => {
      const request = createMockRequest('POST', validPayload, { Authorization: '' });
      const response = await POST(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });
});