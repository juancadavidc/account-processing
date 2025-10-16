import { z } from 'zod';
import { V2WebhookRequest, TransactionEvent, SourceType } from './types';

// Validation schemas for V2 webhook API

export const transactionEventSchema = z.enum(['deposit', 'withdrawal', 'transfer']);

export const sourceTypeSchema = z.enum(['email', 'phone', 'webhook']);

export const sourceValueSchema = z.string()
  .min(1, 'Source value cannot be empty')
  .max(255, 'Source value too long')
  .refine((val) => {
    // Basic validation for email format
    if (val.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }
    // Basic validation for phone format (starts with +)
    if (val.startsWith('+')) {
      return /^\+\d{10,15}$/.test(val);
    }
    // For webhook URLs or other formats, just check it's not empty
    return val.length > 0;
  }, 'Invalid source value format');

export const v2WebhookMetadataSchema = z.object({
  accountNumber: z.string().optional(),
  senderName: z.string().optional(),
  reference: z.string().optional(),
}).catchall(z.any()); // Allow additional fields

export const v2WebhookRequestSchema = z.object({
  source: z.string()
    .min(1, 'Source is required')
    .max(50, 'Source name too long')
    .regex(/^[a-z0-9_-]+$/, 'Source must be lowercase alphanumeric with dashes/underscores'),
  
  timestamp: z.string()
    .datetime({ message: 'Invalid ISO 8601 timestamp format' }),
  
  sourceFrom: sourceValueSchema,
  
  sourceTo: sourceValueSchema,
  
  event: transactionEventSchema,
  
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long'),
  
  amount: z.number()
    .positive('Amount must be positive')
    .max(999999999999, 'Amount too large')
    .refine((val) => Number.isFinite(val), 'Amount must be a valid number'),
  
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO code')
    .default('COP')
    .optional(),
  
  webhookId: z.string()
    .min(1, 'Webhook ID is required')
    .max(255, 'Webhook ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Webhook ID contains invalid characters'),
  
  metadata: v2WebhookMetadataSchema.optional(),
});

// Source management schemas
export const sourceSchema = z.object({
  sourceType: sourceTypeSchema,
  sourceValue: sourceValueSchema,
});

export const createSourceSchema = sourceSchema;

export const updateSourceSchema = z.object({
  isActive: z.boolean(),
});

// Database validation helpers
export const validateV2WebhookPayload = (payload: unknown): payload is V2WebhookRequest => {
  try {
    v2WebhookRequestSchema.parse(payload);
    return true;
  } catch {
    return false;
  }
};

export const parseV2WebhookPayload = (payload: unknown) => {
  return v2WebhookRequestSchema.safeParse(payload);
};

export const validateSourcePayload = (payload: unknown) => {
  return sourceSchema.safeParse(payload);
};

// Response validation
export const v2WebhookResponseSchema = z.object({
  status: z.enum(['processed', 'error', 'duplicate']),
  transactionId: z.string().uuid().optional(),
  webhookId: z.string(),
  error: z.string().optional(),
  sourceId: z.string().uuid().optional(),
});

// Type exports for validation results
export type V2WebhookValidationResult = z.SafeParseReturnType<unknown, V2WebhookRequest>;
export type SourceValidationResult = z.SafeParseReturnType<unknown, { sourceType: SourceType; sourceValue: string; }>;

// Error formatting helper
export const formatValidationErrors = (errors: z.ZodError) => {
  return errors.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
};

// Common validation constants
export const VALIDATION_LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_SOURCE_VALUE_LENGTH: 255,
  MAX_SOURCE_NAME_LENGTH: 50,
  MAX_WEBHOOK_ID_LENGTH: 255,
  MAX_AMOUNT: 999999999999,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 15,
} as const;

// Custom validation helpers
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  return /^\+\d{10,15}$/.test(phone);
};

export const normalizeSourceValue = (value: string, type: SourceType): string => {
  switch (type) {
    case 'email':
      return value.toLowerCase().trim();
    case 'phone':
      // Remove spaces and ensure + prefix
      const cleaned = value.replace(/\s+/g, '');
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    case 'webhook':
      return value.trim();
    default:
      return value.trim();
  }
};