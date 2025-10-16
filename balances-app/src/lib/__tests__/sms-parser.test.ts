import { parseBancolombiaSMS, validateWebhookPayload, BANCOLOMBIA_PATTERN } from '../sms-parser';

describe('SMS Parser', () => {
  describe('BANCOLOMBIA_PATTERN regex', () => {
    it('should match valid Bancolombia SMS format', () => {
      const validMessage = 'Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06';
      expect(BANCOLOMBIA_PATTERN.test(validMessage)).toBe(true);
    });

    it('should match with different amounts and names', () => {
      const message = 'Bancolombia: Recibiste una transferencia por $50,500 de JUAN CARLOS PEREZ en tu cuenta **1234, el 15/12/2024 a las 14:30';
      expect(BANCOLOMBIA_PATTERN.test(message)).toBe(true);
    });

    it('should not match invalid formats', () => {
      const invalidMessages = [
        'Bancolombia: Transfer of $100 from JOHN',
        'Recibiste una transferencia por $100',
        'Bancolombia: Pago de $100 realizado',
        'Different bank: Recibiste una transferencia por $100'
      ];
      
      invalidMessages.forEach(message => {
        expect(BANCOLOMBIA_PATTERN.test(message)).toBe(false);
      });
    });
  });

  describe('parseBancolombiaSMS', () => {
    it('should successfully parse valid Bancolombia SMS', () => {
      const message = 'Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06';
      const result = parseBancolombiaSMS(message);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(190000);
      expect(result.senderName).toBe('MARIA CUBAQUE');
      expect(result.account).toBe('**7251');
      expect(result.time).toBe('08:06');
      expect(result.date).toEqual(new Date(2025, 8, 4)); // Month is 0-indexed
    });

    it('should parse amounts with commas correctly', () => {
      const message = 'Bancolombia: Recibiste una transferencia por $1,250,500 de TEST USER en tu cuenta **9999, el 01/01/2025 a las 12:00';
      const result = parseBancolombiaSMS(message);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(1250500);
    });

    it('should handle amounts without commas', () => {
      const message = 'Bancolombia: Recibiste una transferencia por $500 de SIMPLE USER en tu cuenta **1111, el 01/01/2025 a las 12:00';
      const result = parseBancolombiaSMS(message);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(500);
    });

    it('should trim sender names with extra spaces', () => {
      const message = 'Bancolombia: Recibiste una transferencia por $1000 de  SPACED  NAME  en tu cuenta **2222, el 01/01/2025 a las 12:00';
      const result = parseBancolombiaSMS(message);

      expect(result.success).toBe(true);
      expect(result.senderName).toBe('SPACED  NAME');
    });

    it('should validate date parsing correctly', () => {
      const message = 'Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **3333, el 29/02/2024 a las 12:00';
      const result = parseBancolombiaSMS(message);

      expect(result.success).toBe(true);
      expect(result.date).toEqual(new Date(2024, 1, 29)); // Leap year Feb 29
    });

    it('should validate time format correctly', () => {
      const validTimes = ['00:00', '12:34', '23:59'];
      
      validTimes.forEach(time => {
        const message = `Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **4444, el 01/01/2025 a las ${time}`;
        const result = parseBancolombiaSMS(message);
        expect(result.success).toBe(true);
        expect(result.time).toBe(time);
      });
    });

    it('should fail for non-matching messages', () => {
      const invalidMessages = [
        'Different bank message',
        'Bancolombia: Different type of message',
        'Bancolombia: Pago realizado por $100'
      ];

      invalidMessages.forEach(message => {
        const result = parseBancolombiaSMS(message);
        expect(result.success).toBe(false);
        expect(result.errorReason).toBe('SMS message does not match Bancolombia transfer pattern');
      });
    });

    it('should fail for invalid amounts', () => {
      // Test with valid pattern but invalid amount - should validate after parsing
      const message = 'Bancolombia: Recibiste una transferencia por $0 de TEST USER en tu cuenta **5555, el 01/01/2025 a las 12:00';
      const result = parseBancolombiaSMS(message);
      expect(result.success).toBe(false);
      expect(result.errorReason).toBe('Invalid amount format in SMS');
      
      // Test with completely invalid pattern
      const invalidMessage = 'Bancolombia: Recibiste una transferencia por $invalid de TEST USER en tu cuenta **5555, el 01/01/2025 a las 12:00';
      const invalidResult = parseBancolombiaSMS(invalidMessage);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errorReason).toBe('SMS message does not match Bancolombia transfer pattern');
    });

    it('should fail for empty sender names', () => {
      // Test with pattern that has valid format but empty sender name after regex match
      const message = 'Bancolombia: Recibiste una transferencia por $1000 de   en tu cuenta **6666, el 01/01/2025 a las 12:00';
      const result = parseBancolombiaSMS(message);
      expect(result.success).toBe(false);
      // After regex match, the trimmed sender name will be empty
      expect(result.errorReason).toBe('Empty or invalid sender name');
    });

    it('should fail for invalid account numbers', () => {
      // Test with 4 digit pattern but the parser validates it afterwards
      const message = 'Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **1234, el 01/01/2025 a las 12:00';
      const result = parseBancolombiaSMS(message);
      expect(result.success).toBe(true); // This should actually pass with valid 4 digits
      expect(result.account).toBe('**1234');
      
      // Test with invalid account pattern (not 4 digits)
      const invalidMessage = 'Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **123, el 01/01/2025 a las 12:00';
      const invalidResult = parseBancolombiaSMS(invalidMessage);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errorReason).toBe('SMS message does not match Bancolombia transfer pattern');
    });

    it('should fail for invalid dates', () => {
      // Test with Feb 29, 2025 (2025 is not a leap year, so this should fail)
      const message = 'Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **7777, el 29/02/2025 a las 12:00';
      const result = parseBancolombiaSMS(message);
      expect(result.success).toBe(false);
      expect(result.errorReason).toBe('Invalid date format in SMS');
    });

    it('should fail for invalid time formats', () => {
      // Test with times that would pass pattern matching but fail validation
      const validFormatInvalidValue = 'Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **8888, el 01/01/2025 a las 25:00';
      const result = parseBancolombiaSMS(validFormatInvalidValue);
      expect(result.success).toBe(false);
      expect(result.errorReason).toBe('Invalid time values in SMS');
      
      // Test with completely invalid format
      const invalidFormat = 'Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **8888, el 01/01/2025 a las invalid';
      const invalidResult = parseBancolombiaSMS(invalidFormat);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errorReason).toBe('SMS message does not match Bancolombia transfer pattern');
    });
  });

  describe('validateWebhookPayload', () => {
    const validPayload = {
      message: 'Bancolombia: Recibiste una transferencia por $1000 de TEST USER en tu cuenta **1234, el 01/01/2025 a las 12:00',
      timestamp: '2025-09-05T08:06:30Z',
      phone: '+573001234567',
      webhookId: 'webhook_12345'
    };

    it('should validate correct webhook payload', () => {
      expect(validateWebhookPayload(validPayload)).toBe(true);
    });

    it('should reject null or undefined payload', () => {
      expect(validateWebhookPayload(null)).toBe(false);
      expect(validateWebhookPayload(undefined)).toBe(false);
    });

    it('should reject non-object payload', () => {
      expect(validateWebhookPayload('string')).toBe(false);
      expect(validateWebhookPayload(123)).toBe(false);
      expect(validateWebhookPayload(true)).toBe(false);
    });

    it('should reject payload with missing required fields', () => {
      const requiredFields = ['message', 'timestamp', 'phone', 'webhookId'];
      
      requiredFields.forEach(field => {
        const incompletePayload = { ...validPayload };
        delete incompletePayload[field as keyof typeof validPayload];
        expect(validateWebhookPayload(incompletePayload)).toBe(false);
      });
    });

    it('should reject payload with wrong field types', () => {
      const invalidPayloads = [
        { ...validPayload, message: 123 },
        { ...validPayload, timestamp: null },
        { ...validPayload, phone: [] },
        { ...validPayload, webhookId: {} }
      ];

      invalidPayloads.forEach(payload => {
        expect(validateWebhookPayload(payload)).toBe(false);
      });
    });

    it('should reject payload with empty required strings', () => {
      const emptyStringPayloads = [
        { ...validPayload, message: '' },
        { ...validPayload, webhookId: '' }
      ];

      emptyStringPayloads.forEach(payload => {
        expect(validateWebhookPayload(payload)).toBe(false);
      });
    });

    it('should allow empty timestamp and phone (as they might be optional)', () => {
      const payloadWithEmptyOptionals = {
        ...validPayload,
        timestamp: '',
        phone: ''
      };
      expect(validateWebhookPayload(payloadWithEmptyOptionals)).toBe(true);
    });
  });
});