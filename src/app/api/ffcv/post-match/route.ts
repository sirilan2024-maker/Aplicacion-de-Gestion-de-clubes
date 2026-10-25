import { NextRequest, NextResponse } from 'next/server';
import { syncRecentlyFinishedMatches } from '@/lib/ffcv/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const result = await syncRecentlyFinishedMatches();
    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (err: any) {
    console.error('[Post-Match Route] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
