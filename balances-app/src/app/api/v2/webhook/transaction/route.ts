import { NextRequest, NextResponse } from 'next/server';
import { V2WebhookRequest, V2WebhookResponse, SourceType } from '@/lib/types';
import { parseV2WebhookPayload, formatValidationErrors } from '@/lib/v2-validation';
import { V2DatabaseService } from '@/lib/v2-database';
import { logger } from '@/lib/logger';

// Runtime configuration for Vercel Edge Function
export const runtime = 'edge';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.WEBHOOK_SECRET;

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
    // Environment validation
    if (!supabaseUrl || !supabaseServiceKey || !webhookSecret) {
      logger.error('Missing required environment variables', { 
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasWebhookSecret: !!webhookSecret
      });
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Server configuration error',
          webhookId: 'unknown'
        } as V2WebhookResponse,
        { status: 500, headers: corsHeaders }
      );
    }

    // Request size validation (prevent large payloads)
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 20000) { // 20KB limit for V2 (larger due to metadata)
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Request payload too large',
          webhookId: 'unknown'
        } as V2WebhookResponse,
        { status: 413, headers: corsHeaders }
      );
    }

    // Rate limiting check (simple IP-based)
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    logger.info('V2 Webhook request received', { clientIP });

    // Timestamp validation (reject old requests > 10 minutes for V2)
    const requestTimestamp = request.headers.get('X-Timestamp');
    if (requestTimestamp) {
      const requestTime = new Date(requestTimestamp);
      const now = new Date();
      const timeDiff = now.getTime() - requestTime.getTime();
      if (timeDiff > 10 * 60 * 1000) { // 10 minutes
        return NextResponse.json(
          { 
            status: 'error', 
            error: 'Request timestamp too old',
            webhookId: 'unknown'
          } as V2WebhookResponse,
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Bearer token authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Missing or invalid authorization header',
          webhookId: 'unknown'
        } as V2WebhookResponse,
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== webhookSecret) {
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Invalid webhook token',
          webhookId: 'unknown'
        } as V2WebhookResponse,
        { status: 401, headers: corsHeaders }
      );
    }

    // Content-Type validation
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Content-Type must be application/json',
          webhookId: 'unknown'
        } as V2WebhookResponse,
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse and validate request body
    let webhookData: V2WebhookRequest;
    try {
      const body = await request.json();
      const validationResult = parseV2WebhookPayload(body);
      
      if (!validationResult.success) {
        const errors = formatValidationErrors(validationResult.error);
        logger.error('V2 Webhook validation failed', { 
          webhookId: body?.webhookId || 'unknown',
          errors: errors.map(e => `${e.field}: ${e.message}`)
        });
        
        return NextResponse.json(
          { 
            status: 'error', 
            error: `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
            webhookId: body?.webhookId || 'unknown'
          } as V2WebhookResponse,
          { status: 400, headers: corsHeaders }
        );
      }
      
      webhookData = validationResult.data;
    } catch (parseError) {
      logger.error('V2 Webhook JSON parsing failed', { 
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Invalid JSON payload',
          webhookId: 'unknown'
        } as V2WebhookResponse,
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize V2 Database Service
    const dbService = new V2DatabaseService(supabaseUrl, supabaseServiceKey);

    // Determine source type from sourceTo value
    let sourceType: SourceType;
    if (webhookData.sourceTo.includes('@')) {
      sourceType = 'email';
    } else if (webhookData.sourceTo.startsWith('+')) {
      sourceType = 'phone';
    } else {
      sourceType = 'webhook';
    }

    // Find or create the source
    const { data: source, error: sourceError } = await dbService.findOrCreateSource(
      sourceType, 
      webhookData.sourceTo
    );

    if (sourceError || !source) {
      console.error('Failed to find/create source:', sourceError);
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Failed to process source',
          webhookId: webhookData.webhookId
        } as V2WebhookResponse,
        { status: 500, headers: corsHeaders }
      );
    }

    // Check if any users have this source configured
    const { data: userIds, error: usersError } = await dbService.getUsersForSource(source.id);
    
    if (usersError) {
      console.error('Failed to get users for source:', usersError);
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Failed to find users for source',
          webhookId: webhookData.webhookId
        } as V2WebhookResponse,
        { status: 500, headers: corsHeaders }
      );
    }

    if (userIds.length === 0) {
      console.warn(`No users configured for source: ${webhookData.sourceTo}`);
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'No users configured for this source',
          webhookId: webhookData.webhookId,
          sourceId: source.id
        } as V2WebhookResponse,
        { status: 404, headers: corsHeaders }
      );
    }

    // Create the transaction
    const { data: transaction, error: transactionError } = await dbService.createV2Transaction(
      source.id,
      webhookData
    );

    if (transactionError) {
      if (transactionError.message.includes('Duplicate webhook ID')) {
        // Check if we have an existing transaction to return the ID
        console.log(`Duplicate webhook ID detected: ${webhookData.webhookId}`);
        return NextResponse.json(
          { 
            status: 'duplicate',
            webhookId: webhookData.webhookId,
            sourceId: source.id
          } as V2WebhookResponse,
          { status: 200, headers: corsHeaders }
        );
      }

      console.error('Failed to create transaction:', transactionError);
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Failed to store transaction',
          webhookId: webhookData.webhookId
        } as V2WebhookResponse,
        { status: 500, headers: corsHeaders }
      );
    }

    if (!transaction) {
      console.error('Transaction creation returned null');
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Transaction creation failed',
          webhookId: webhookData.webhookId
        } as V2WebhookResponse,
        { status: 500, headers: corsHeaders }
      );
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log success metrics
    logger.webhookSuccess(webhookData.webhookId, transaction.id, responseTime, {
      sourceId: source.id,
      sourceType: source.sourceType,
      sourceTo: webhookData.sourceTo,
      event: webhookData.event,
      amount: webhookData.amount,
      usersNotified: userIds.length
    });

    return NextResponse.json(
      { 
        status: 'processed', 
        transactionId: transaction.id, 
        webhookId: webhookData.webhookId,
        sourceId: source.id
      } as V2WebhookResponse,
      { status: 200, headers: corsHeaders }
    );

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