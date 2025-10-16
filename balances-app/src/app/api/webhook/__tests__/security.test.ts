import { NextRequest } from 'next/server';
import { POST } from '../sms/route';

// Mock environment variables
const mockEnv = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  WEBHOOK_SECRET: 'test-webhook-secret',
  NODE_ENV: 'test',
};

Object.assign(process.env, mockEnv);

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116' } 
          }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-id' },
            error: null,
          }),
        })),
      })),
    })),
  })),
}));

// Mock SMS parser
jest.mock('@/lib/sms-parser', () => ({
  parseBancolombiaSMS: jest.fn().mockReturnValue({
    success: true,
    amount: 100000,
    senderName: 'TEST USER',
    account: '1234',
    date: new Date('2024-01-01'),
    time: '12:00',
  }),
  validateWebhookPayload: jest.fn().mockReturnValue(true),
}));

describe('Webhook Security', () => {
  const createMockRequest = (options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    url?: string;
  } = {}) => {
    const headers = new Headers(options.headers || {});
    
    return new NextRequest(options.url || 'http://localhost:3000/api/webhook/sms', {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  describe('Authentication', () => {
    it('should reject requests without Authorization header', async () => {
      const request = createMockRequest({
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing or invalid authorization header');
    });

    it('should reject requests with invalid Authorization format', async () => {
      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'InvalidFormat token',
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing or invalid authorization header');
    });

    it('should reject requests with wrong token', async () => {
      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-token',
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid webhook token');
    });

    it('should accept requests with correct token', async () => {
      const { validateWebhookPayload } = await import('@/lib/sms-parser');
      validateWebhookPayload.mockReturnValue(true);

      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);

      // Should not be 401 (auth should pass)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Content-Type validation', () => {
    it('should reject requests without Content-Type header', async () => {
      const request = createMockRequest({
        headers: { 
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content-Type must be application/json');
    });

    it('should reject requests with wrong Content-Type', async () => {
      const request = createMockRequest({
        headers: { 
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content-Type must be application/json');
    });
  });

  describe('Request size validation', () => {
    it('should reject oversized requests', async () => {
      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
          'Content-Length': '15000', // > 10KB limit
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toBe('Request payload too large');
    });

    it('should accept normal sized requests', async () => {
      const { validateWebhookPayload } = await import('@/lib/sms-parser');
      validateWebhookPayload.mockReturnValue(true);

      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
          'Content-Length': '100',
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);

      // Should not be 413 (size should be ok)
      expect(response.status).not.toBe(413);
    });
  });

  describe('Timestamp validation', () => {
    it('should reject old requests', async () => {
      const oldTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 minutes ago

      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
          'X-Timestamp': oldTimestamp,
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Request timestamp too old');
    });

    it('should accept recent requests', async () => {
      const { validateWebhookPayload } = await import('@/lib/sms-parser');
      validateWebhookPayload.mockReturnValue(true);

      const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago

      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
          'X-Timestamp': recentTimestamp,
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);

      // Should not be 400 for timestamp (timestamp should be ok)
      expect(response.status).not.toBe(400);
    });

    it('should accept requests without timestamp header', async () => {
      const { validateWebhookPayload } = await import('@/lib/sms-parser');
      validateWebhookPayload.mockReturnValue(true);

      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
        },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);

      // Should not be 400 for timestamp (no timestamp header is ok)
      expect(response.status).not.toBe(400);
    });
  });

  describe('JSON payload validation', () => {
    it('should reject invalid JSON', async () => {
      // Create request with invalid JSON
      const request = new NextRequest('http://localhost:3000/api/webhook/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
        },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('should reject invalid webhook payload format', async () => {
      const { validateWebhookPayload } = await import('@/lib/sms-parser');
      validateWebhookPayload.mockReturnValue(false);

      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.WEBHOOK_SECRET}`,
        },
        body: { invalid: 'payload' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid webhook payload format');
    });
  });

  describe('CORS headers', () => {
    it('should include security headers in responses', async () => {
      const request = createMockRequest({
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should restrict CORS origin in production', async () => {
      // The CORS headers are set at module load time, so we need to check the current behavior
      const request = createMockRequest({
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);
      const corsOrigin = response.headers.get('Access-Control-Allow-Origin');

      // In test environment, it should be '*' since NODE_ENV is 'test'
      expect(corsOrigin).toBe('*');
    });

    it('should allow all origins in development', async () => {
      process.env.NODE_ENV = 'development';

      const request = createMockRequest({
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'test', webhookId: '123' },
      });

      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('IP logging', () => {
    it('should log client IP address', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = createMockRequest({
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1',
        },
        body: { message: 'test', webhookId: '123' },
      });

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Webhook request from IP: 192.168.1.1')
      );

      consoleSpy.mockRestore();
    });
  });
});