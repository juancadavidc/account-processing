import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/lib/repositories';
import { logger } from '@/lib/logger';

// Runtime configuration
export const runtime = 'edge';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '3600',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/sources - Get all sources (admin only) or sources for current user
export async function GET(request: NextRequest) {
  try {
    const sourceRepository = RepositoryFactory.getSourceRepository();
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const sourceId = url.searchParams.get('sourceId');

    // If sourceId is provided, get specific source
    if (sourceId) {
      const { data: source, error } = await sourceRepository.getSourceById(sourceId);
      
      if (error) {
        logger.error('Failed to get source by ID', { sourceId, error: error.message });
        return NextResponse.json(
          { error: 'Failed to get source' },
          { status: 500, headers: corsHeaders }
        );
      }

      if (!source) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json({ source }, { headers: corsHeaders });
    }

    // If userId is provided, get sources for that user
    if (userId) {
      const { data: sources, error } = await sourceRepository.getSourcesForUser(userId);
      
      if (error) {
        logger.error('Failed to get sources for user', { userId, error: error.message });
        return NextResponse.json(
          { error: 'Failed to get user sources' },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json({ sources }, { headers: corsHeaders });
    }

    // No specific parameters - return error
    return NextResponse.json(
      { error: 'Missing required parameters: userId or sourceId' },
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    logger.error('Sources API error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/sources - Create a new source
export async function POST(request: NextRequest) {
  try {
    const sourceRepository = RepositoryFactory.getSourceRepository();
    const body = await request.json();
    
    const { sourceType, sourceValue } = body;
    
    if (!sourceType || !sourceValue) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceType, sourceValue' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['email', 'phone', 'webhook'].includes(sourceType)) {
      return NextResponse.json(
        { error: 'Invalid sourceType. Must be: email, phone, or webhook' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: source, error } = await sourceRepository.findOrCreateSource(
      sourceType as 'email' | 'phone' | 'webhook', 
      sourceValue
    );

    if (error) {
      logger.error('Failed to create source', { sourceType, sourceValue, error: error.message });
      return NextResponse.json(
        { error: 'Failed to create source' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ source }, { status: 201, headers: corsHeaders });

  } catch (error) {
    logger.error('Create source API error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

