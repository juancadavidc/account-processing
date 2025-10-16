import { NextRequest } from 'next/server';
import { POST, GET, OPTIONS } from '../route';
import { V2WebhookRequest } from '@/lib/types';

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';

// Mock V2DatabaseService
const mockDbService = {
  findOrCreateSource: jest.fn(),
  getUsersForSource: jest.fn(),
  createV2Transaction: jest.fn(),
};

jest.mock('@/lib/v2-database', () => ({
  V2DatabaseService: jest.fn().mockImplementation(() => mockDbService),
}));

// Helper function to create mock NextRequest
const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-webhook-secret',
    ...headers,
  };

  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn((key: string) => defaultHeaders[key] || null),
    },
  } as unknown as NextRequest;
};

describe('/api/v2/webhook/transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OPTIONS', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('X-API-Version')).toBe('v2');
    });
  });

  describe('GET', () => {
    it('should return health check information', async () => {
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.version).toBe('v2');
      expect(data.endpoints).toHaveLength(1);
    });
  });

  describe('POST', () => {
    const validWebhookPayload: V2WebhookRequest = {
      source: 'bancolombia',
      timestamp: '2025-09-04T08:06:00Z',
      sourceFrom: 'bancolombia@noreply.com',
      sourceTo: 'jdcadavid96@gmail.com',
      event: 'deposit',
      message: 'Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251',
      amount: 190000,
      currency: 'COP',
      webhookId: 'webhook_1693814760_12345',
      metadata: {
        accountNumber: '7251',
        senderName: 'MARIA CUBAQUE'
      }
    };

    it('should process valid webhook successfully', async () => {
      const mockSource = {
        id: 'source-123',
        sourceType: 'email',
        sourceValue: 'jdcadavid96@gmail.com',
        createdAt: new Date()
      };

      const mockTransaction = {
        id: 'transaction-123',
        sourceId: 'source-123',
        amount: 190000,
        webhookId: 'webhook_1693814760_12345'
      };

      mockDbService.findOrCreateSource.mockResolvedValue({
        data: mockSource,
        error: null
      });

      mockDbService.getUsersForSource.mockResolvedValue({
        data: ['user-1', 'user-2'],
        error: null
      });

      mockDbService.createV2Transaction.mockResolvedValue({
        data: mockTransaction,
        error: null
      });

      const request = createMockRequest(validWebhookPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('processed');
      expect(data.transactionId).toBe('transaction-123');
      expect(data.webhookId).toBe('webhook_1693814760_12345');
      expect(data.sourceId).toBe('source-123');
    });

    it('should reject request without authorization header', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'Content-Type': 'application/json',
        // No Authorization header
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.status).toBe('error');
      expect(data.error).toContain('authorization header');
    });

    it('should reject request with invalid token', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Invalid webhook token');
    });

    it('should reject request with invalid content type', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'Content-Type': 'text/plain',
        'Authorization': 'Bearer test-webhook-secret',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Content-Type must be application/json');
    });

    it('should reject request with payload too large', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-webhook-secret',
        'Content-Length': '25000', // Over 20KB limit
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.status).toBe('error');
      expect(data.error).toContain('payload too large');
    });

    it('should reject request with old timestamp', async () => {
      const oldTimestamp = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
      
      const request = createMockRequest(validWebhookPayload, {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-webhook-secret',
        'X-Timestamp': oldTimestamp,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toContain('timestamp too old');
    });

    it('should reject invalid JSON payload', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: {
          get: jest.fn((key: string) => {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-webhook-secret',
            };
            return headers[key] || null;
          }),
        },
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Invalid JSON payload');
    });

    it('should reject payload with validation errors', async () => {
      const invalidPayload = {
        ...validWebhookPayload,
        amount: -100, // Invalid negative amount
        event: 'invalid_event', // Invalid event type
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Validation failed');
    });

    it('should handle source creation error', async () => {
      mockDbService.findOrCreateSource.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const request = createMockRequest(validWebhookPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Failed to process source');
    });

    it('should handle case when no users are configured for source', async () => {
      const mockSource = {
        id: 'source-123',
        sourceType: 'email',
        sourceValue: 'unconfigured@example.com',
        createdAt: new Date()
      };

      mockDbService.findOrCreateSource.mockResolvedValue({
        data: mockSource,
        error: null
      });

      mockDbService.getUsersForSource.mockResolvedValue({
        data: [], // No users configured
        error: null
      });

      const request = createMockRequest(validWebhookPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.status).toBe('error');
      expect(data.error).toContain('No users configured for this source');
      expect(data.sourceId).toBe('source-123');
    });

    it('should handle duplicate webhook ID', async () => {
      const mockSource = {
        id: 'source-123',
        sourceType: 'email',
        sourceValue: 'jdcadavid96@gmail.com',
        createdAt: new Date()
      };

      mockDbService.findOrCreateSource.mockResolvedValue({
        data: mockSource,
        error: null
      });

      mockDbService.getUsersForSource.mockResolvedValue({
        data: ['user-1'],
        error: null
      });

      mockDbService.createV2Transaction.mockResolvedValue({
        data: null,
        error: new Error('Duplicate webhook ID')
      });

      const request = createMockRequest(validWebhookPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('duplicate');
      expect(data.webhookId).toBe('webhook_1693814760_12345');
      expect(data.sourceId).toBe('source-123');
    });

    it('should handle transaction creation error', async () => {
      const mockSource = {
        id: 'source-123',
        sourceType: 'email',
        sourceValue: 'jdcadavid96@gmail.com',
        createdAt: new Date()
      };

      mockDbService.findOrCreateSource.mockResolvedValue({
        data: mockSource,
        error: null
      });

      mockDbService.getUsersForSource.mockResolvedValue({
        data: ['user-1'],
        error: null
      });

      mockDbService.createV2Transaction.mockResolvedValue({
        data: null,
        error: new Error('Database insert failed')
      });

      const request = createMockRequest(validWebhookPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Failed to store transaction');
    });

    it('should handle unexpected errors', async () => {
      mockDbService.findOrCreateSource.mockRejectedValue(new Error('Unexpected error'));

      const request = createMockRequest(validWebhookPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Internal server error');
    });

    it('should determine source type correctly', async () => {
      const testCases = [
        {
          sourceTo: 'test@example.com',
          expectedType: 'email'
        },
        {
          sourceTo: '+573001234567',
          expectedType: 'phone'
        },
        {
          sourceTo: 'webhook-endpoint',
          expectedType: 'webhook'
        }
      ];

      for (const testCase of testCases) {
        const payload = {
          ...validWebhookPayload,
          sourceTo: testCase.sourceTo
        };

        const mockSource = {
          id: 'source-123',
          sourceType: testCase.expectedType,
          sourceValue: testCase.sourceTo,
          createdAt: new Date()
        };

        mockDbService.findOrCreateSource.mockResolvedValue({
          data: mockSource,
          error: null
        });

        mockDbService.getUsersForSource.mockResolvedValue({
          data: ['user-1'],
          error: null
        });

        mockDbService.createV2Transaction.mockResolvedValue({
          data: { id: 'transaction-123', webhookId: payload.webhookId },
          error: null
        });

        const request = createMockRequest(payload);
        await POST(request);

        expect(mockDbService.findOrCreateSource).toHaveBeenCalledWith(
          testCase.expectedType,
          testCase.sourceTo
        );

        mockDbService.findOrCreateSource.mockClear();
      }
    });

    it('should handle missing environment variables', async () => {
      // Temporarily delete environment variables
      const originalSupabaseUrl = process.env.SUPABASE_URL;
      delete process.env.SUPABASE_URL;

      const request = createMockRequest(validWebhookPayload);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Server configuration error');

      // Restore environment variable
      process.env.SUPABASE_URL = originalSupabaseUrl;
    });

    it('should include performance metrics in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockSource = {
        id: 'source-123',
        sourceType: 'email',
        sourceValue: 'jdcadavid96@gmail.com',
        createdAt: new Date()
      };

      const mockTransaction = {
        id: 'transaction-123',
        sourceId: 'source-123',
        amount: 190000,
        webhookId: 'webhook_1693814760_12345'
      };

      mockDbService.findOrCreateSource.mockResolvedValue({
        data: mockSource,
        error: null
      });

      mockDbService.getUsersForSource.mockResolvedValue({
        data: ['user-1'],
        error: null
      });

      mockDbService.createV2Transaction.mockResolvedValue({
        data: mockTransaction,
        error: null
      });

      const request = createMockRequest(validWebhookPayload);
      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('V2 Webhook processed successfully'),
        expect.objectContaining({
          webhookId: 'webhook_1693814760_12345',
          transactionId: 'transaction-123',
          sourceId: 'source-123',
          responseTime: expect.any(Number)
        })
      );

      consoleSpy.mockRestore();
    });
  });
});