import { V2DatabaseService } from '../v2-database';
import { V2WebhookRequest, Source, SourceType } from '../types';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('V2DatabaseService', () => {
  let dbService: V2DatabaseService;
  
  beforeEach(() => {
    dbService = new V2DatabaseService('mock-url', 'mock-key');
    jest.clearAllMocks();
  });

  describe('findOrCreateSource', () => {
    it('should return existing source if found', async () => {
      const mockExistingSource = {
        id: 'source-123',
        source_type: 'email',
        source_value: 'test@example.com',
        created_at: '2025-09-04T08:00:00Z'
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockExistingSource,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.findOrCreateSource('email', 'test@example.com');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'source-123',
        sourceType: 'email',
        sourceValue: 'test@example.com',
        createdAt: new Date('2025-09-04T08:00:00Z')
      });
    });

    it('should create new source if not found', async () => {
      const mockNewSource = {
        id: 'source-456',
        source_type: 'phone',
        source_value: '+573001234567',
        created_at: '2025-09-04T08:00:00Z'
      };

      // Mock finding no existing source
      const mockSelectNotFound = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // Not found error
            })
          })
        })
      });

      // Mock creating new source
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockNewSource,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: mockSelectNotFound
      }).mockReturnValueOnce({
        insert: mockInsert
      });

      const result = await dbService.findOrCreateSource('phone', '+573001234567');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'source-456',
        sourceType: 'phone',
        sourceValue: '+573001234567',
        createdAt: new Date('2025-09-04T08:00:00Z')
      });
    });

    it('should handle database errors', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'SOME_ERROR', message: 'Database error' }
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.findOrCreateSource('email', 'test@example.com');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Failed to find source');
      expect(result.data).toBeNull();
    });
  });

  describe('getSourceById', () => {
    it('should return source if found', async () => {
      const mockSource = {
        id: 'source-123',
        source_type: 'email',
        source_value: 'test@example.com',
        created_at: '2025-09-04T08:00:00Z'
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSource,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.getSourceById('source-123');

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe('source-123');
    });

    it('should handle source not found', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.getSourceById('nonexistent');

      expect(result.error?.message).toBe('Source not found');
      expect(result.data).toBeNull();
    });
  });

  describe('getUsersForSource', () => {
    it('should return user IDs for a source', async () => {
      const mockUserSources = [
        { user_id: 'user-1' },
        { user_id: 'user-2' }
      ];

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockUserSources,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.getUsersForSource('source-123');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(['user-1', 'user-2']);
    });

    it('should handle empty result', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.getUsersForSource('source-123');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });

  describe('addUserSource', () => {
    it('should add user-source association', async () => {
      const mockUserSource = {
        id: 'user-source-123',
        user_id: 'user-1',
        source_id: 'source-1',
        is_active: true,
        created_at: '2025-09-04T08:00:00Z'
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserSource,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      const result = await dbService.addUserSource('user-1', 'source-1');

      expect(result.error).toBeNull();
      expect(result.data?.userId).toBe('user-1');
      expect(result.data?.sourceId).toBe('source-1');
    });

    it('should handle duplicate association', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'Unique constraint violation' }
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      const result = await dbService.addUserSource('user-1', 'source-1');

      expect(result.error?.message).toContain('already associated');
      expect(result.data).toBeNull();
    });
  });

  describe('createV2Transaction', () => {
    it('should create a new transaction', async () => {
      const mockWebhookData: V2WebhookRequest = {
        source: 'bancolombia',
        timestamp: '2025-09-04T08:06:00Z',
        sourceFrom: 'bancolombia@noreply.com',
        sourceTo: 'test@example.com',
        event: 'deposit',
        message: 'Test transaction',
        amount: 190000,
        currency: 'COP',
        webhookId: 'webhook-123',
        metadata: {
          accountNumber: '7251',
          senderName: 'MARIA CUBAQUE'
        }
      };

      const mockTransaction = {
        id: 'transaction-123',
        source_id: 'source-1',
        amount: '190000',
        currency: 'COP',
        sender_name: 'MARIA CUBAQUE',
        account_number: '7251',
        transaction_date: '2025-09-04',
        transaction_time: '08:06:00',
        raw_message: 'Test transaction',
        parsed_at: '2025-09-04T08:06:00Z',
        webhook_id: 'webhook-123',
        event: 'deposit',
        status: 'processed',
        created_at: '2025-09-04T08:06:00Z'
      };

      // Mock duplicate check (no existing transaction)
      const mockSelectDuplicate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // Not found
          })
        })
      });

      // Mock transaction creation
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTransaction,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: mockSelectDuplicate
      }).mockReturnValueOnce({
        insert: mockInsert
      });

      const result = await dbService.createV2Transaction('source-1', mockWebhookData);

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe('transaction-123');
      expect(result.data?.amount).toBe(190000);
      expect(result.data?.sourceId).toBe('source-1');
    });

    it('should detect duplicate webhook ID', async () => {
      const mockWebhookData: V2WebhookRequest = {
        source: 'bancolombia',
        timestamp: '2025-09-04T08:06:00Z',
        sourceFrom: 'bancolombia@noreply.com',
        sourceTo: 'test@example.com',
        event: 'deposit',
        message: 'Test transaction',
        amount: 190000,
        webhookId: 'webhook-123'
      };

      const mockExistingTransaction = {
        id: 'existing-123',
        webhook_id: 'webhook-123'
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockExistingTransaction,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.createV2Transaction('source-1', mockWebhookData);

      expect(result.error?.message).toBe('Duplicate webhook ID');
      expect(result.data).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const result = await dbService.findOrCreateSource('email', 'test@example.com');

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw 'String error';
      });

      const result = await dbService.getSourceById('source-123');

      expect(result.error?.message).toContain('Unknown error');
      expect(result.data).toBeNull();
    });
  });

  describe('data transformation', () => {
    it('should correctly transform database source to domain model', async () => {
      const mockDbSource = {
        id: 'source-123',
        source_type: 'email',
        source_value: 'test@example.com',
        created_at: '2025-09-04T08:00:00Z'
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockDbSource,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await dbService.getSourceById('source-123');

      expect(result.data).toEqual({
        id: 'source-123',
        sourceType: 'email',
        sourceValue: 'test@example.com',
        createdAt: new Date('2025-09-04T08:00:00Z')
      });
    });

    it('should correctly transform database transaction to domain model', async () => {
      const mockWebhookData: V2WebhookRequest = {
        source: 'bancolombia',
        timestamp: '2025-09-04T08:06:30Z',
        sourceFrom: 'bancolombia@noreply.com',
        sourceTo: 'test@example.com',
        event: 'deposit',
        message: 'Test transaction',
        amount: 190000,
        webhookId: 'webhook-123'
      };

      const mockDbTransaction = {
        id: 'transaction-123',
        source_id: 'source-1',
        amount: '190000.50',
        currency: 'COP',
        sender_name: 'TEST SENDER',
        account_number: '7251',
        transaction_date: '2025-09-04',
        transaction_time: '08:06:30',
        raw_message: 'Test transaction',
        parsed_at: '2025-09-04T08:06:30Z',
        webhook_id: 'webhook-123',
        event: 'deposit',
        status: 'processed',
        created_at: '2025-09-04T08:06:30Z'
      };

      // Mock duplicate check and insert
      const mockSelectDuplicate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockDbTransaction,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: mockSelectDuplicate
      }).mockReturnValueOnce({
        insert: mockInsert
      });

      const result = await dbService.createV2Transaction('source-1', mockWebhookData);

      expect(result.data).toEqual({
        id: 'transaction-123',
        sourceId: 'source-1',
        amount: 190000.50,
        currency: 'COP',
        senderName: 'TEST SENDER',
        accountNumber: '7251',
        date: new Date('2025-09-04T08:06:30'),
        time: '08:06:30',
        rawMessage: 'Test transaction',
        parsedAt: new Date('2025-09-04T08:06:30Z'),
        webhookId: 'webhook-123',
        event: 'deposit',
        status: 'processed'
      });
    });
  });
});