import { NextRequest, NextResponse } from 'next/server';
import { syncAllConfiguredFFCVTeams } from '@/lib/ffcv/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds on Vercel Pro if needed

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is configured, enforce strict authorization
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
    const querySecret = req.nextUrl.searchParams.get('secret');
    if (querySecret === cronSecret) {
      return true;
    }
    return false;
  }

  // In development environments without CRON_SECRET defined, allow local execution
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    const syncAllMatchdays = req.nextUrl.searchParams.get('all') === 'true';
    const specificMatchdayParam = req.nextUrl.searchParams.get('jornada');
    const specificMatchday = specificMatchdayParam ? Number(specificMatchdayParam) : undefined;

    console.log('[FFCV Cron] Starting hourly synchronization...');
    const result = await syncAllConfiguredFFCVTeams({
      syncAllMatchdays,
      specificMatchday
    });

    console.log('[FFCV Cron] Completed. Groups processed:', result.groupsProcessed, 'Success:', result.groupsSuccess, 'Failed:', result.groupsFailed);
    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      result
    });
  } catch (err: any) {
    console.error('[FFCV Cron] Error during hourly synchronization:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error in FFCV cron' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
