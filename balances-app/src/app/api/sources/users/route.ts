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
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '3600',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/sources/users?sourceId=xxx - Get users for a specific source
export async function GET(request: NextRequest) {
  try {
    const sourceRepository = RepositoryFactory.getSourceRepository();
    const url = new URL(request.url);
    const sourceId = url.searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sourceId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: userIds, error } = await sourceRepository.getUsersForSource(sourceId);

    if (error) {
      logger.error('Failed to get users for source', { sourceId, error: error.message });
      return NextResponse.json(
        { error: 'Failed to get users for source' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ 
      sourceId, 
      userIds,
      count: userIds.length 
    }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Get users for source API error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/sources/users - Associate a user with a source
export async function POST(request: NextRequest) {
  try {
    const sourceRepository = RepositoryFactory.getSourceRepository();
    const body = await request.json();
    
    const { userId, sourceId } = body;
    
    if (!userId || !sourceId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, sourceId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: userSource, error } = await sourceRepository.addUserSource(userId, sourceId);

    if (error) {
      logger.error('Failed to add user source', { userId, sourceId, error: error.message });
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json({ userSource }, { status: 201, headers: corsHeaders });

  } catch (error) {
    logger.error('Add user source API error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/sources/users - Remove user-source association
export async function DELETE(request: NextRequest) {
  try {
    const sourceRepository = RepositoryFactory.getSourceRepository();
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const sourceId = url.searchParams.get('sourceId');
    
    if (!userId || !sourceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, sourceId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error } = await sourceRepository.removeUserSource(userId, sourceId);

    if (error) {
      logger.error('Failed to remove user source', { userId, sourceId, error: error.message });
      return NextResponse.json(
        { error: 'Failed to remove user source association' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ 
      message: 'User source association removed successfully' 
    }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Remove user source API error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

