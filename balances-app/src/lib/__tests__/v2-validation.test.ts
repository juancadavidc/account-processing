import { 
  parseV2WebhookPayload, 
  validateV2WebhookPayload,
  validateSourcePayload,
  formatValidationErrors,
  isValidEmail,
  isValidPhone,
  normalizeSourceValue
} from '../v2-validation';
import { V2WebhookRequest, SourceType } from '../types';

describe('V2 Validation', () => {
  describe('parseV2WebhookPayload', () => {
    const validPayload: V2WebhookRequest = {
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

    it('should validate a valid V2 webhook payload', () => {
      const result = parseV2WebhookPayload(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('should handle optional currency field', () => {
      const payloadWithoutCurrency = { ...validPayload };
      delete payloadWithoutCurrency.currency;
      
      const result = parseV2WebhookPayload(payloadWithoutCurrency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('COP'); // Should default to COP
      }
    });

    it('should handle optional metadata field', () => {
      const payloadWithoutMetadata = { ...validPayload };
      delete payloadWithoutMetadata.metadata;
      
      const result = parseV2WebhookPayload(payloadWithoutMetadata);
      expect(result.success).toBe(true);
    });

    it('should reject payload with missing required fields', () => {
      const invalidPayload = { ...validPayload };
      delete (invalidPayload as any).amount;
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with invalid source format', () => {
      const invalidPayload = { 
        ...validPayload, 
        source: 'INVALID SOURCE!' 
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with invalid timestamp', () => {
      const invalidPayload = { 
        ...validPayload, 
        timestamp: 'not-a-valid-timestamp' 
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with negative amount', () => {
      const invalidPayload = { 
        ...validPayload, 
        amount: -100 
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with invalid event type', () => {
      const invalidPayload = { 
        ...validPayload, 
        event: 'invalid_event' 
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with invalid currency format', () => {
      const invalidPayload = { 
        ...validPayload, 
        currency: 'INVALID' 
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with too large amount', () => {
      const invalidPayload = { 
        ...validPayload, 
        amount: 9999999999999 // Exceeds max limit
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with empty message', () => {
      const invalidPayload = { 
        ...validPayload, 
        message: '' 
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with invalid webhook ID format', () => {
      const invalidPayload = { 
        ...validPayload, 
        webhookId: 'invalid webhook id!' 
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('validateV2WebhookPayload', () => {
    it('should return true for valid payload', () => {
      const validPayload = {
        source: 'bancolombia',
        timestamp: '2025-09-04T08:06:00Z',
        sourceFrom: 'bancolombia@noreply.com',
        sourceTo: 'jdcadavid96@gmail.com',
        event: 'deposit',
        message: 'Test message',
        amount: 190000,
        webhookId: 'webhook_12345'
      };
      
      expect(validateV2WebhookPayload(validPayload)).toBe(true);
    });

    it('should return false for invalid payload', () => {
      const invalidPayload = {
        source: 'bancolombia',
        // Missing required fields
      };
      
      expect(validateV2WebhookPayload(invalidPayload)).toBe(false);
    });
  });

  describe('validateSourcePayload', () => {
    it('should validate email source', () => {
      const emailSource = {
        sourceType: 'email' as SourceType,
        sourceValue: 'test@example.com'
      };
      
      const result = validateSourcePayload(emailSource);
      expect(result.success).toBe(true);
    });

    it('should validate phone source', () => {
      const phoneSource = {
        sourceType: 'phone' as SourceType,
        sourceValue: '+573001234567'
      };
      
      const result = validateSourcePayload(phoneSource);
      expect(result.success).toBe(true);
    });

    it('should validate webhook source', () => {
      const webhookSource = {
        sourceType: 'webhook' as SourceType,
        sourceValue: 'https://example.com/webhook'
      };
      
      const result = validateSourcePayload(webhookSource);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidEmailSource = {
        sourceType: 'email' as SourceType,
        sourceValue: 'not-an-email'
      };
      
      const result = validateSourcePayload(invalidEmailSource);
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone format', () => {
      const invalidPhoneSource = {
        sourceType: 'phone' as SourceType,
        sourceValue: '123' // Too short
      };
      
      const result = validateSourcePayload(invalidPhoneSource);
      expect(result.success).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const invalidPayload = {
        amount: -100, // Invalid negative amount
        source: '', // Empty source
      };
      
      const result = parseV2WebhookPayload(invalidPayload);
      if (!result.success) {
        const formattedErrors = formatValidationErrors(result.error);
        expect(formattedErrors).toHaveLength(expect.any(Number));
        expect(formattedErrors[0]).toHaveProperty('field');
        expect(formattedErrors[0]).toHaveProperty('message');
        expect(formattedErrors[0]).toHaveProperty('code');
      }
    });
  });

  describe('helper functions', () => {
    describe('isValidEmail', () => {
      it('should validate correct email formats', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
        expect(isValidEmail('bancolombia@noreply.com')).toBe(true);
      });

      it('should reject invalid email formats', () => {
        expect(isValidEmail('not-an-email')).toBe(false);
        expect(isValidEmail('@domain.com')).toBe(false);
        expect(isValidEmail('user@')).toBe(false);
        expect(isValidEmail('')).toBe(false);
      });
    });

    describe('isValidPhone', () => {
      it('should validate correct phone formats', () => {
        expect(isValidPhone('+573001234567')).toBe(true);
        expect(isValidPhone('+1234567890123')).toBe(true);
        expect(isValidPhone('+12345678901')).toBe(true);
      });

      it('should reject invalid phone formats', () => {
        expect(isValidPhone('573001234567')).toBe(false); // Missing +
        expect(isValidPhone('+123')).toBe(false); // Too short
        expect(isValidPhone('+1234567890123456')).toBe(false); // Too long
        expect(isValidPhone('+abc1234567890')).toBe(false); // Contains letters
      });
    });

    describe('normalizeSourceValue', () => {
      it('should normalize email values', () => {
        expect(normalizeSourceValue('  TEST@EXAMPLE.COM  ', 'email')).toBe('test@example.com');
        expect(normalizeSourceValue('User@Domain.COM', 'email')).toBe('user@domain.com');
      });

      it('should normalize phone values', () => {
        expect(normalizeSourceValue('573001234567', 'phone')).toBe('+573001234567');
        expect(normalizeSourceValue('+57 300 123 4567', 'phone')).toBe('+573001234567');
        expect(normalizeSourceValue('+573001234567', 'phone')).toBe('+573001234567');
      });

      it('should normalize webhook values', () => {
        expect(normalizeSourceValue('  https://example.com  ', 'webhook')).toBe('https://example.com');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(2000); // Max length
      const payload = {
        source: 'bancolombia',
        timestamp: '2025-09-04T08:06:00Z',
        sourceFrom: 'bancolombia@noreply.com',
        sourceTo: 'jdcadavid96@gmail.com',
        event: 'deposit',
        message: longMessage,
        amount: 190000,
        webhookId: 'webhook_12345'
      };
      
      const result = parseV2WebhookPayload(payload);
      expect(result.success).toBe(true);
    });

    it('should reject messages that are too long', () => {
      const tooLongMessage = 'A'.repeat(2001); // Over max length
      const payload = {
        source: 'bancolombia',
        timestamp: '2025-09-04T08:06:00Z',
        sourceFrom: 'bancolombia@noreply.com',
        sourceTo: 'jdcadavid96@gmail.com',
        event: 'deposit',
        message: tooLongMessage,
        amount: 190000,
        webhookId: 'webhook_12345'
      };
      
      const result = parseV2WebhookPayload(payload);
      expect(result.success).toBe(false);
    });

    it('should handle metadata with additional fields', () => {
      const payload = {
        source: 'bancolombia',
        timestamp: '2025-09-04T08:06:00Z',
        sourceFrom: 'bancolombia@noreply.com',
        sourceTo: 'jdcadavid96@gmail.com',
        event: 'deposit',
        message: 'Test message',
        amount: 190000,
        webhookId: 'webhook_12345',
        metadata: {
          accountNumber: '7251',
          senderName: 'MARIA CUBAQUE',
          customField: 'custom value',
          anotherField: 123
        }
      };
      
      const result = parseV2WebhookPayload(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata?.customField).toBe('custom value');
        expect(result.data.metadata?.anotherField).toBe(123);
      }
    });
  });
});