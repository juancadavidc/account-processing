import { NextRequest } from 'next/server';
import { validateWebhookPayload } from '../sms-parser';
import { parseV2WebhookPayload, formatValidationErrors } from '../v2-validation';
import { logger } from '../logger';
import { IWebhookService, IWebhookRepository } from '../repositories/interfaces';
import { WebhookRequest, V2WebhookRequest } from '../types';

export class WebhookService implements IWebhookService {
  private webhookRepository: IWebhookRepository;
  private webhookSecret: string;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(webhookRepository: IWebhookRepository, webhookSecret: string) {
    this.webhookRepository = webhookRepository;
    this.webhookSecret = webhookSecret;
  }

  async processWebhook(
    webhookData: WebhookRequest | V2WebhookRequest, 
    version: 'v1' | 'v2'
  ): Promise<{
    success: boolean;
    transactionId?: string;
    sourceId?: string;
    error?: string;
    isDuplicate?: boolean;
  }> {
    if (version === 'v1') {
      return await this.webhookRepository.processSMSWebhook(webhookData as WebhookRequest);
    } else {
      return await this.webhookRepository.processV2Webhook(webhookData as V2WebhookRequest);
    }
  }

  async validateWebhookRequest(request: NextRequest): Promise<{
    isValid: boolean;
    webhookData?: WebhookRequest | V2WebhookRequest;
    error?: string;
  }> {
    try {
      // Environment validation
      if (!this.webhookSecret) {
        return {
          isValid: false,
          error: 'Server configuration error'
        };
      }

      // Request size validation
      const contentLength = request.headers.get('Content-Length');
      const maxSize = request.url.includes('/v2/') ? 20000 : 10000; // V2 allows larger payloads
      if (contentLength && parseInt(contentLength) > maxSize) {
        return {
          isValid: false,
          error: 'Request payload too large'
        };
      }

      // Rate limiting check
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      
      if (!(await this.checkRateLimit(clientIP))) {
        return {
          isValid: false,
          error: 'Rate limit exceeded'
        };
      }

      // Timestamp validation
      const requestTimestamp = request.headers.get('X-Timestamp');
      const maxAgeMinutes = request.url.includes('/v2/') ? 10 : 5; // V2 allows older requests
      if (requestTimestamp && !(await this.validateTimestamp(requestTimestamp, maxAgeMinutes))) {
        return {
          isValid: false,
          error: 'Request timestamp too old'
        };
      }

      // Bearer token authentication
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          isValid: false,
          error: 'Missing or invalid authorization header'
        };
      }

      const token = authHeader.replace('Bearer ', '');
      if (!(await this.validateAuthToken(token))) {
        return {
          isValid: false,
          error: 'Invalid webhook token'
        };
      }

      // Content-Type validation
      const contentType = request.headers.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        return {
          isValid: false,
          error: 'Content-Type must be application/json'
        };
      }

      // Parse request body
      const body = await request.json();
      
      // Determine version and validate accordingly
      if (request.url.includes('/v2/')) {
        // V2 validation
        const validationResult = parseV2WebhookPayload(body);
        
        if (!validationResult.success) {
          const errors = formatValidationErrors(validationResult.error);
          logger.error('V2 Webhook validation failed', { 
            webhookId: body?.webhookId || 'unknown',
            errors: errors.map(e => `${e.field}: ${e.message}`)
          });
          
          return {
            isValid: false,
            error: `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`
          };
        }
        
        return {
          isValid: true,
          webhookData: validationResult.data
        };
      } else {
        // V1 validation
        if (!validateWebhookPayload(body)) {
          return {
            isValid: false,
            error: 'Invalid webhook payload format'
          };
        }
        
        return {
          isValid: true,
          webhookData: body as WebhookRequest
        };
      }

    } catch (parseError) {
      logger.error('Webhook request validation failed', { 
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
      
      return {
        isValid: false,
        error: 'Invalid JSON payload'
      };
    }
  }

  async checkRateLimit(clientIP: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 100; // Max requests per window

    const key = `rate_limit_${clientIP}`;
    const current = this.rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new window
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    // Increment counter
    current.count++;
    this.rateLimitMap.set(key, current);
    return true;
  }

  async validateTimestamp(timestamp: string, maxAgeMinutes: number): Promise<boolean> {
    try {
      const requestTime = new Date(timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - requestTime.getTime();
      const maxAgeMs = maxAgeMinutes * 60 * 1000;
      
      return timeDiff <= maxAgeMs;
    } catch {
      return false;
    }
  }

  async validateAuthToken(token: string): Promise<boolean> {
    return token === this.webhookSecret;
  }

  // Clean up expired rate limit entries
  cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitMap.entries()) {
      if (now > value.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

