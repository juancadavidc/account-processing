import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/lib/repositories';
import { V2WebhookResponse, V2WebhookRequest } from '@/lib/types';
import { logger } from '@/lib/logger';

// Runtime configuration for Vercel Edge Function
export const runtime = 'edge';

// CORS headers for webhook responses
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
  'X-API-Version': 'v2',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialize services
    const webhookService = RepositoryFactory.getWebhookService();

    // Validate webhook request
    const validation = await webhookService.validateWebhookRequest(request);
    if (!validation.isValid) {
      return NextResponse.json(
        { status: 'error', error: validation.error, webhookId: 'unknown' } as V2WebhookResponse,
        { status: 400, headers: corsHeaders }
      );
    }

    const webhookData = validation.webhookData! as V2WebhookRequest;

    // Process webhook using repository pattern
    const result = await webhookService.processWebhook(webhookData, 'v2');

    // Calculate response time
    const responseTime = Date.now() - startTime;

    if (result.success) {
      // Log success metrics
      logger.webhookSuccess(webhookData.webhookId, result.transactionId!, responseTime, {
        sourceId: result.sourceId,
        sourceTo: webhookData.sourceTo,
        event: webhookData.event,
        amount: webhookData.amount,
        isDuplicate: result.isDuplicate || false
      });

      const status = result.isDuplicate ? 'duplicate' : 'processed';
      return NextResponse.json(
        { 
          status, 
          transactionId: result.transactionId, 
          webhookId: webhookData.webhookId,
          sourceId: result.sourceId
        } as V2WebhookResponse,
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
        } as V2WebhookResponse,
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.webhookError('unknown', error instanceof Error ? error.message : 'Unknown error', responseTime, {
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Internal server error',
        webhookId: 'unknown'
      } as V2WebhookResponse,
      { status: 500, headers: corsHeaders }
    );
  }
}

// Health check endpoint for V2 webhook
export async function GET() {
  return NextResponse.json(
    { 
      status: 'healthy', 
      version: 'v2',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /api/v2/webhook/transaction - Process structured transaction webhook'
      ]
    },
    { headers: corsHeaders }
  );
}