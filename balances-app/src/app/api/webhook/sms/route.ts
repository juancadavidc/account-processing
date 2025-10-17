import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/lib/repositories';
import { WebhookResponse } from '@/lib/types';
import { logger } from '@/lib/logger';

// Runtime configuration for Vercel Edge Function
export const runtime = 'edge';

// CORS headers for webhook responses - restricted to specific origins for security
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://webhook-allowed-domain.com' // Replace with actual webhook sender domain
    : '*', // Allow all origins in development
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '3600',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialize services
    const webhookService = RepositoryFactory.getWebhookService();
    const webhookRepository = RepositoryFactory.getWebhookRepository();

    // Validate webhook request
    const validation = await webhookService.validateWebhookRequest(request);
    if (!validation.isValid) {
      return NextResponse.json(
        { status: 'error', error: validation.error } as WebhookResponse,
        { status: 400, headers: corsHeaders }
      );
    }

    const webhookData = validation.webhookData!;

    // Process webhook using repository pattern
    const result = await webhookService.processWebhook(webhookData, 'v1');

    // Calculate response time
    const responseTime = Date.now() - startTime;

    if (result.success) {
      // Log success metrics
      logger.webhookSuccess(webhookData.webhookId, result.transactionId!, responseTime, {
        amount: webhookData.message ? 'parsed from SMS' : 'unknown',
        isDuplicate: result.isDuplicate || false
      });

      const status = result.isDuplicate ? 'duplicate' : 'processed';
      return NextResponse.json(
        { 
          status, 
          transactionId: result.transactionId, 
          webhookId: webhookData.webhookId 
        } as WebhookResponse,
        { status: 200, headers: corsHeaders }
      );
    } else {
      // Log error
      logger.webhookError(webhookData.webhookId, result.error || 'Unknown error', responseTime, {
        errorType: 'processing_error'
      });

      return NextResponse.json(
        { 
          status: 'error', 
          error: result.error,
          webhookId: webhookData.webhookId 
        } as WebhookResponse,
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.webhookError('unknown', error instanceof Error ? error.message : 'Unknown error', responseTime, {
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json(
      { status: 'error', error: 'Internal server error' } as WebhookResponse,
      { status: 500, headers: corsHeaders }
    );
  }
}

// Rate limiting would be handled by Vercel's built-in protection
// Additional rate limiting can be added via middleware if needed